import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import { FlowNavigationBackEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';
import { subscribe, unsubscribe } from 'lightning/empApi';
import OD_DatatableResource from '@salesforce/resourceUrl/OD_Datatable';
import getFieldsForObject from '@salesforce/apex/OD_DatatableRecordsController.getFieldsForObject';
import saveRecords from '@salesforce/apex/OD_DatatableRecordsController.saveRecords';
import getRecords from '@salesforce/apex/OD_DatatableRecordsController.getRecords';
import {
  ALIGNMENT_OPTIONS,
  HEADER_ACTION_TYPES,
  YES_NO,
  EMPTY_STRING,
  EVENTS,
  CUSTOM_FIELD_TYPES,
  ROW_BUTTON_CONFIGURATION,
  HIDDEN_TYPE_OPTIONS,
  GROUPING_SOURCE,
  INLINE_FLOW,
  PLATFORM_EVENT_CHANNEL_NAME,
  ROW_BUTTON_TYPE,
  SELECTION_TYPES,
  SORT_DIRECTION,
  SHARING_CONTEXT,
} from 'c/odDatatableConstants';
import {
  reduceErrors,
  getFieldType,
  getPrecision,
  generateRandomString,
  sortArrayByProperty,
} from 'c/odDatatableUtils';
import OdDatatableFlow from 'c/odDatatableFlow';

const SPACES_FOR_TOTALS = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
const NO_GROUP = 'no-group';

export default class ODDatatable extends LightningElement {
  // internal use
  @api uniqueTableName;

  // flow
  @api availableActions = [];

  // table configuration
  @api objectName;
  @api columns;
  @api noRecordsMessage;
  @api showRowNumberColumn;

  // sharing
  @api sharingContext = SHARING_CONTEXT.WITHOUT_SHARING;

  // master detail configuration
  @api isMasterDetail;
  @api masterDetailConfiguration;
  @api masterDetailField1;
  @api masterDetailField2;

  // add, edit, delete
  @api canAdd;
  @api addLabel = 'Add';
  @api addType;
  @api addFlowName;
  @api addFlowInputVariables;
  @api canEdit;
  @api editType;
  @api editLabel = 'Edit';
  @api editFlowName;
  @api editFlowInputVariables;
  @api canDelete;
  @api canBulkDelete;
  @api bulkDeleteLabel = 'Delete';
  @api canBulkEdit;
  @api bulkEditLabel = 'Bulk Edit';

  // selection
  @api canSelect = YES_NO.NO;
  @api selectionType;

  // save
  @api inlineSave;
  @api saveLabel = 'Save';
  @api navigateNextAfterSave;

  // platform event
  @api listenToPlatformEvent;
  @api platformEventMatchingFieldName;
  @api platformEventMatchingId;

  // preview
  @api preview = false;

  // pagination
  @api pagination;
  @api paginationAlignment;
  @api pageSize;
  @api paginationShowOptions;

  // grouping
  @api grouping;
  @api groupingField;
  @api groupSortField;
  @api groupSortDirection = SORT_DIRECTION.ASC.value;
  @api groupContentSortField;
  @api groupContentSortDirection = SORT_DIRECTION.ASC.value;
  @api groupingSource = GROUPING_SOURCE.DATASET;
  @api groupingSourceFieldData;
  @api showEmptyGroups;
  @api canCollapseGroups;

  // summarize
  @api showTotalsByGroup;
  @api recalculateLive;

  // exports
  @api canExport = YES_NO.NO;
  @api exportGroups = YES_NO.NO;
  @api exportFileName;

  // outputs
  @api saveAndNext = false;
  @api outputAddedRows = [];
  @api outputEditedRows = [];
  @api outputDeletedRows = [];
  @api outputSelectedRows = [];
  @api rowRecordId;
  @api rowRecord;
  @api rowRecordIds;
  @api rowButtonClicked;
  @api wasChanged = false;

  @track columnsToShow = [];
  @track columnsForBulkEdit = [];
  @track recordsToShow = [];

  @track _selectedRows = [];

  isLoading = true;
  errorMessage = false;
  isSaving = false;
  savingMessage = ' ';
  currentPage = 0;

  fieldsThatChanged = [];

  showBulkEditPopup = false;

  _allColumns = [];
  _validInvalidFields = {};
  afterValidate = false;

  _originalTableData;
  _tableData;

  // platform event
  _subscription;

  // grouping
  _collapsedRecordsByGroupId = {};

  // =================================================================
  // validate flow method
  // =================================================================
  @api
  validate() {
    let isValid = true;
    let errorMessage = 'Please review the errors in the table to be able to continue';

    // check if there is at least one non valid, return the error
    if (Object.values(this._validInvalidFields).some((fa) => !fa)) {
      isValid = false;
    }

    if (isValid) {
      // check the required fields with value, return false on the first one (this is for fields that are required but not navigated to them)
      this.columnsToShow.every((col) => {
        this._tableData
          .filter((row) => !row._originalRecord._isGroupRecord && !row._originalRecord._isSummarizeRecord)
          .every((rec) => {
            if (col.typeAttributes.editable && col.typeAttributes.required && !rec[col.fieldName] && !rec.isDeleted) {
              isValid = false;
              return false;
            }
            return true;
          });

        return isValid;
      });

      // check the save if it's inline
      if (this.isInlineSave && this.hasChanges && isValid && !this.isSaving) {
        isValid = false;
        errorMessage = 'You need to Save or cancel the changes to continue.';
      }
    }

    // if it's not valid, set the data in the cache
    if (!isValid) {
      this._setSessionStorage();
    }

    return {
      isValid,
      errorMessage: isValid ? '' : errorMessage,
    };
  }

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    Promise.all([loadStyle(this, `${OD_DatatableResource}/css/main.css`)]);

    // subscribe to platform event
    if (this._listeningToPlatformEvent) {
      this._subscribeToPlatformEvent();
    }

    // get the variables from the session storage if any
    this._getSessionStoredVariables();
  }

  disconnectedCallback() {
    // unsubscribe from platform event
    if (this._listeningToPlatformEvent) {
      this._unsubscribeFromPlatformEvent();
    }
  }

  // =================================================================
  // wire methods
  // =================================================================
  @wire(getFieldsForObject, { withSharing: '$_withSharing', objectName: '$objectName' })
  _getFields(result) {
    if (result.data) {
      // build the columns
      this._buildColumns(result.data);

      this._getAccessAndBuildRecords(this.tableData);

      // clean the output variables
      if (!this.afterValidate) {
        this._doCleanOutputs(true, false);
      }
    } else if (result.error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(result.error);
    }
  }

  // =================================================================
  // getter methods
  // =================================================================
  @api
  get tableData() {
    return this._tableData || [];
  }

  set tableData(data = []) {
    if (!this.isLoading) {
      this._getAccessAndBuildRecords(data);
    } else {
      this._tableData = data;
    }
  }

  get _dataRowIndexes() {
    return this._tableData
      .map((row, index) =>
        !row._originalRecord._isGroupRecord && !row._originalRecord._isSummarizeRecord ? index : -1,
      )
      .filter((index) => index !== -1);
  }

  get _paginatedData() {
    // Get the slice of regular row indices we want for this page
    const paginatedRegularIndexes = this._dataRowIndexes.slice(
      this.currentPage * this._pageSizeNumber,
      this._pageSizeNumber * (this.currentPage + 1),
    );

    if (paginatedRegularIndexes.length > 0) {
      // Find the first special row before our paginated set
      let startIndex = paginatedRegularIndexes[0];
      while (startIndex > 0 && this._tableData[startIndex - 1]._originalRecord._isGroupRecord) {
        startIndex--;
      }

      // Find the last special row after our paginated set
      let endIndex = paginatedRegularIndexes[paginatedRegularIndexes.length - 1];
      while (
        endIndex < this._tableData.length - 1 &&
        this._tableData[endIndex + 1]._originalRecord._isSummarizeRecord
      ) {
        endIndex++;
      }

      // Return all rows between start and end index
      return this._tableData.slice(startIndex, endIndex + 1);
    }

    return [];
  }

  get dataToShow() {
    if (this.showPagination) {
      return this._paginatedData;
    }

    return this._tableData;
  }

  get loaded() {
    return !this.isLoading;
  }

  get _storageTag() {
    return this.uniqueTableName;
  }

  get showAddButton() {
    return this.canAdd === YES_NO.YES;
  }

  get addHasLabel() {
    return this.addLabel && this.addLabel !== EMPTY_STRING;
  }

  get showBulkDeleteButton() {
    return this.canBulkDelete === YES_NO.YES;
  }

  get bulkDeleteHasLabel() {
    return this.bulkDeleteLabel && this.bulkDeleteLabel !== EMPTY_STRING;
  }

  get showColumnRowNumber() {
    return this.showRowNumberColumn === YES_NO.YES && !this.showGrouping && !this._anySummarizedColumn;
  }

  get selectionDisabled() {
    return (
      this.canBulkDelete === YES_NO.NO &&
      this.canBulkEdit === YES_NO.NO &&
      this.otherBulkFlowButtons.length === 0 &&
      this.canSelect === YES_NO.NO
    );
  }

  get _isSingleSelection() {
    return this.selectionType === SELECTION_TYPES.SINGLE;
  }

  get maxiumRowSelection() {
    // if any bulk operation then the selection is always multiple
    if (this.canBulkDelete === YES_NO.YES || this.canBulkEdit === YES_NO.YES || this.otherBulkFlowButtons.length > 0) {
      return;
    } else {
      if (this._isSingleSelection) {
        return 1;
      } else {
        return;
      }
    }
  }

  get bulkOperationDisabled() {
    return (
      this._selectedRows.length === 0 ||
      this.standardButtonsDisabled ||
      !this._selectedRows.some((row) => !row._originalRecord._isGroupRecord)
    );
  }

  get showBulkEditButton() {
    return this.canBulkEdit === YES_NO.YES;
  }

  get bulkEditHasLabel() {
    return this.bulkEditLabel && this.bulkEditLabel !== EMPTY_STRING;
  }

  get _editInline() {
    return this.canEdit === YES_NO.YES && this.editType === INLINE_FLOW.INLINE;
  }

  get _editWithFlow() {
    return this.canEdit === YES_NO.YES && this.editType === INLINE_FLOW.FLOW;
  }

  get _addInline() {
    return this.canAdd === YES_NO.YES && this.addType === INLINE_FLOW.INLINE;
  }

  get _addWithFlow() {
    return this.canAdd === YES_NO.YES && this.addType === INLINE_FLOW.FLOW;
  }

  get isInlineSave() {
    return this.inlineSave === YES_NO.YES;
  }

  get _navigateNextAfterSave() {
    return this.navigateNextAfterSave === YES_NO.YES;
  }

  get _canDelete() {
    return this.canDelete === YES_NO.YES;
  }

  get hasChanges() {
    return this.wasChanged;
  }

  get standardButtonsDisabled() {
    return this.hasChanges && this.isInlineSave && this._addWithFlow;
  }

  get showSaveButtons() {
    return this.hasChanges && this.isInlineSave;
  }

  get otherBulkFlowButtons() {
    return this._allColumns.filter(
      (cl) => cl.typeAttributes.config && cl.typeAttributes.config.showAs && cl.typeAttributes.config.showAsMultiple,
    );
  }

  get bottomNavButtons() {
    return this._allColumns.filter(
      (cl) => cl.typeAttributes.config && cl.typeAttributes.config.showAs && cl.typeAttributes.config.showInBottomNav,
    );
  }

  get mainBottomNavButtons() {
    const result = [];
    const mainButtons = this.bottomNavButtons.filter((btn) => btn.typeAttributes.config.mainButton);

    // if any main button, check that at least have 1 child
    if (mainButtons.length > 0) {
      mainButtons.forEach((mainBtn) => {
        const children = this.bottomNavButtons.filter(
          (btn) => btn.typeAttributes.config.groupUnder === mainBtn.fieldName,
        );

        if (children.length > 0) {
          result.push({
            ...mainBtn,
            children,
          });
        }
      });
    }

    return result;
  }

  get _flattenedMainBottomNavButtons() {
    return this.mainBottomNavButtons.reduce((flat, btn) => {
      const flattened = [btn];
      if (btn.children && Array.isArray(btn.children)) {
        flattened.push(...btn.children);
      }
      return [...flat, ...flattened];
    }, []);
  }

  get otherBottomNavButtons() {
    return this.bottomNavButtons.filter(
      (btn) => !this._flattenedMainBottomNavButtons.some((mainBtn) => mainBtn.fieldName === btn.fieldName),
    );
  }

  get _listeningToPlatformEvent() {
    return this.listenToPlatformEvent === YES_NO.YES;
  }

  get isThereAnyButton() {
    return (
      this.showAddButton ||
      this.showBulkDeleteButton ||
      this.showBulkEditButton ||
      this.otherBulkFlowButtons.length > 0 ||
      this.bottomNavButtons.length > 0 ||
      this.showSaveButtons
    );
  }

  get showPagination() {
    return this.pagination === YES_NO.YES && this.totalPages > 1;
  }

  get _pageSizeNumber() {
    return parseInt(this.pageSize, 10);
  }

  get showPaginationNavigationOptions() {
    return this.paginationShowOptions === YES_NO.YES;
  }

  get paginationClasses() {
    return `slds-p-top--x-small slds-size--1-of-1 slds-text-align--${this.paginationAlignment} pagination`;
  }

  get totalPages() {
    return Math.ceil(this._dataRowIndexes.length / this._pageSizeNumber);
  }

  get pages() {
    const result = [];
    for (let i = 0; i < this.totalPages; i++) {
      result.push({
        page: i + 1,
        value: i,
        classes: `slds-button slds-m-right_xx-small${this.currentPage === i ? ' current' : ''}`,
      });
    }

    return result;
  }

  get isFirstPage() {
    return this.currentPage === 0;
  }

  get isLastPage() {
    return this.currentPage + 1 === this.totalPages;
  }

  get showGrouping() {
    return this.grouping === YES_NO.YES;
  }

  get _showTotalsByGroup() {
    return this.showTotalsByGroup === YES_NO.YES;
  }

  get _canCollapseGroups() {
    return this.canCollapseGroups === YES_NO.YES;
  }

  get _recalculateLive() {
    return this.recalculateLive === YES_NO.YES;
  }

  get _selectedRowsToProcessBulk() {
    return this._selectedRows.filter(
      (row) => !row._originalRecord._isGroupRecord && !row._originalRecord._isSummarizeRecord,
    );
  }

  get selectedRowsIds() {
    return this._selectedRows.map((sr) => sr._id);
  }

  get _anySummarizedColumn() {
    return this.columnsToShow.filter((col) => col.typeAttributes.config.summarize).length > 0;
  }

  get showExportButton() {
    return this.canExport === YES_NO.YES;
  }

  get _doExportGroups() {
    return this.exportGroups === YES_NO.YES;
  }

  get _hasExportFileName() {
    return this.exportFileName && this.exportFileName !== EMPTY_STRING;
  }

  get _withSharing() {
    return this.sharingContext === SHARING_CONTEXT.WITH_SHARING;
  }

  // =================================================================
  // private methods
  // =================================================================
  _getSessionStoredVariables() {
    if (sessionStorage[this._storageTag]) {
      const result = JSON.parse(sessionStorage[this._storageTag]);

      if (result) {
        this.outputAddedRows = result.added ? JSON.parse(JSON.stringify(result.added)) : [];
        this.outputEditedRows = result.edited ? JSON.parse(JSON.stringify(result.edited)) : [];
        this.outputDeletedRows = result.deleted ? JSON.parse(JSON.stringify(result.deleted)) : [];

        if (this.outputAddedRows.length > 0 || this.outputEditedRows.length > 0 || this.outputDeletedRows.length > 0) {
          this.wasChanged = true;
        }

        this.afterValidate = true;

        // delete it from the storage
        this._doRemoveSessionStorage();
      }
    }
  }

  _doRemoveSessionStorage() {
    sessionStorage[this._storageTag] = null;
    sessionStorage.removeItem(this._storageTag);
  }

  _setSessionStorage() {
    const objectToSave = {
      added: this.outputAddedRows,
      edited: this.outputEditedRows,
      deleted: this.outputDeletedRows,
    };
    sessionStorage[this._storageTag] = JSON.stringify(objectToSave);
  }

  _subscribeToPlatformEvent() {
    // Invoke subscribe method of empApi. and manage the message
    subscribe(PLATFORM_EVENT_CHANNEL_NAME, -1, (response) => {
      console.log(`Subscription request sent to: ${response.channel}`);
      this._subscription = response;

      const recordId = response.data.payload.Record_Id__c;

      // if it's the same record
      if (this.platformEventMatchingId === recordId) {
        this._doGetUpdatedData();
      }
    });
  }

  _unsubscribeFromPlatformEvent() {
    if (this._subscription) {
      unsubscribe(this._subscription, (response) => {
        const result = JSON.parse(JSON.stringify(response));
        console.log(
          `Unsubscribe response from: ${result.subscription} was ${result.successful ? 'successful' : 'unsuccessful'}`,
        );
        this._subscription = undefined;
      });
    }
  }

  _buildRecords(dataToUse, afterSave = false) {
    let result = [];

    this._originalTableData = dataToUse.filter(
      (rs) => !rs._originalRecord?._isGroupRecord && !rs._originalRecord?._isSummarizeRecord,
    );

    this._originalTableData.forEach((rec, index, array) => {
      // if this record is in the stored session one use the stored one (for when we validate and back to the same page)
      const indexEdited = this.outputEditedRows.findIndex((ed) => ed._id === rec.Id);
      const indexDeleted = this.outputDeletedRows.findIndex((dl) => dl._id === rec.Id);

      if (indexEdited !== -1 && !afterSave) {
        result.push(this.outputEditedRows[indexEdited]);
      } else if (indexDeleted !== -1 && !afterSave) {
        result.push(this.outputDeletedRows[indexDeleted]);
      } else {
        let record = {
          ...rec,
          _id: rec.Id,
          _originalRecord: {
            ...rec,
            _isFirst: index === 0,
            _isLast: index === array.length - 1,
          },
          isDeleted: false,
          ...ROW_BUTTON_CONFIGURATION.DELETE,
        };

        if (this._editWithFlow) {
          record = {
            ...record,
            ...ROW_BUTTON_CONFIGURATION.EDIT,
            _editLabel: this.editLabel,
          };
        }
        result.push(record);
      }
    });

    // add the added rows if any
    if (this.outputAddedRows.length > 0 && !afterSave) {
      result = result.concat(this.outputAddedRows);
    }

    const totalRow = this._checkAndSummarize(result);

    result = this.showGrouping ? this._groupData(result) : result;

    // add the total row to the end if any
    if (totalRow) {
      result.push(totalRow);
    }

    this._tableData = result;
  }

  _getAccessAndBuildRecords(data, afterSave = false) {
    let dataToUse = JSON.parse(JSON.stringify(data));

    if (this._withSharing && dataToUse.length > 0) {
      getRecords({
        withSharing: this._withSharing,
        objectName: this.objectName,
        fields: '',
        fieldNameFilter: 'Id',
        idsToQuery: dataToUse.map((dt) => dt.Id),
      })
        .then((accessData) => {
          this.isLoading = false;
          this.errorMessage = false;

          dataToUse = dataToUse.map((dt) => ({
            ...dt,
            ...JSON.parse(JSON.stringify(accessData.find((ad) => ad.Id === dt.Id) ?? {})),
          }));

          this._buildRecords(dataToUse, afterSave);
        })
        .catch((error) => {
          this.isLoading = false;
          this.errorMessage = reduceErrors(error);
        });
    } else {
      this.isLoading = false;
      this.errorMessage = false;
      this._buildRecords(dataToUse, afterSave);
    }
  }

  _buildColumns(columnsFromObject) {
    let columnsConfiguration = JSON.parse(this.columns);

    // add the after validate to all the columns
    if (this.afterValidate) {
      columnsConfiguration.forEach((col) => {
        col.typeAttributes.config.afterValidate = true;
      });
    }

    // filter custom column field types
    if (this.isInlineSave || this.canEdit === YES_NO.NO || this._editWithFlow) {
      columnsConfiguration = columnsConfiguration.filter(
        (col) =>
          (col.typeAttributes.config.isCustom && !CUSTOM_FIELD_TYPES.includes(col.typeAttributes.type)) ||
          !col.typeAttributes.config.isCustom,
      );
    }

    // set editable to all false if the whole table is not editable or if the edit type is Flow
    if (this.canEdit === YES_NO.NO || this._editWithFlow) {
      columnsConfiguration.forEach((col) => {
        col.typeAttributes.editable = false;
      });
    }

    // check if some of the columns changed the type/precision/scale/digits and/or max length
    columnsConfiguration.forEach((col) => {
      const indexObj = columnsFromObject.findIndex((co) => co.value === col.fieldName);

      if (indexObj !== -1) {
        const columnObject = columnsFromObject[indexObj];

        if (
          getFieldType(columnObject.type) !== col.typeAttributes.type ||
          getPrecision(columnObject) !== col.typeAttributes.config.precision ||
          columnObject.scale !== col.typeAttributes.config.scale ||
          columnObject.maxLength !== col.typeAttributes.config.maxLength
        ) {
          this.fieldsThatChanged.push({
            label: `${col.tableLabel} (API Name: ${columnObject.value})`,
            name: columnObject.value,
          });
        }
      }

      // build the bulk edit columns in case we need it
      if (col.typeAttributes.editable) {
        let addField = true;
        // if a field has a {{Record. string in the where condition it means it needs to be filtered by the record so it cannot be bulk edit
        if (col.typeAttributes.config.lookupConfig) {
          const parsed = JSON.parse(col.typeAttributes.config.lookupConfig);

          if (parsed.whereCondition && parsed.whereCondition.includes('{{Record.')) {
            addField = false;
          }
        }

        if (addField) {
          this.columnsForBulkEdit.push({
            label: `${col.typeAttributes.required ? '* ' : ''}${col.tableLabel}`,
            order: col.order,
            fieldName: col.fieldName,
            type: col.typeAttributes.type,
            maxLength: col.typeAttributes.config.maxLength,
            parentObjectName: col.typeAttributes.config.parentObjectName,
            options: col.typeAttributes.config.options,
            scale: col.typeAttributes.config.scale,
            precision: col.typeAttributes.config.precision,
            isHTML: col.typeAttributes.config.isHTML,
            isMulti: col.typeAttributes.config.isMulti,
            lookupConfig: col.typeAttributes.config.lookupConfig,
          });
        }
      }
    });

    // add an extra column to the end if we have edit enabled and by flow
    if (this._editWithFlow) {
      columnsConfiguration.push({
        type: ROW_BUTTON_TYPE,
        initialWidth: 80,
        hideDefaultActions: true,
        typeAttributes: {
          recordId: { fieldName: '_id' },
          record: { fieldName: '_originalRecord' },
          name: { fieldName: '_editAction' },
          label: { fieldName: '_editLabel' },
          isDeleted: { fieldName: 'isDeleted' },
          hasChanges: { fieldName: '_hasChanges' },
          config: { alignment: ALIGNMENT_OPTIONS.CENTER.value, isCustom: true },
        },
      });
    }

    // add an extra column to the end if we have the option to delete
    if (this._canDelete) {
      columnsConfiguration.push({
        type: ROW_BUTTON_TYPE,
        initialWidth: 50,
        hideDefaultActions: true,
        typeAttributes: {
          recordId: { fieldName: '_id' },
          record: { fieldName: '_originalRecord' },
          name: { fieldName: '_deleteAction' },
          hasChanges: { fieldName: '_hasChanges' },
          isDeleted: { fieldName: 'isDeleted' },
          config: { alignment: ALIGNMENT_OPTIONS.CENTER.value, isButtonIcon: true, isCustom: true },
        },
      });
    }

    // check for hidden property
    columnsConfiguration.forEach((col) => {
      if (col.typeAttributes.config && col.typeAttributes.config.hidden) {
        // if it's not a record based condition, hide it
        if (col.typeAttributes.config.hiddenType !== HIDDEN_TYPE_OPTIONS.RECORD.value) {
          col.hidden = true;
        }
      }

      // always add the with sharing to the config object
      (col.typeAttributes.config || {}).withSharing = this._withSharing;
    });

    this._allColumns = columnsConfiguration;
    this.columnsToShow = columnsConfiguration.filter((cl) => !cl.hidden);
  }

  _doUpdateRecord(recordIndex, newObject, isAdd = false) {
    this._tableData = [
      ...this._tableData.slice(0, recordIndex),
      {
        ...(isAdd ? {} : this._tableData[recordIndex]),
        ...newObject,
      },
      ...this._tableData.slice(recordIndex + (isAdd ? 0 : 1)),
    ];
  }

  _doDelete(recordIndex) {
    if (recordIndex !== -1) {
      const recordToDelete = JSON.parse(JSON.stringify(this._tableData[recordIndex]));

      // if it's a new add, delete the record from the collection
      if (this._tableData[recordIndex].isNew) {
        // if it's the last one just do an assignment, otherwise do the slice for the second part
        if (recordIndex === this._tableData.length - 1) {
          this._tableData = this._tableData.slice(0, recordIndex);
        } else {
          this._tableData = [...this._tableData.slice(0, recordIndex), ...this._tableData.slice(recordIndex + 1)];
        }

        if (this.showPagination) {
          // if the current page is greater than the total, it means we deleted one from the last page and need to go 1 page down
          if (this.currentPage >= this.totalPages) {
            this.handleLastPage();
          }
        }
      } else {
        const newObj = {
          isDeleted: true,
          ...ROW_BUTTON_CONFIGURATION.UNDELETE,
        };

        this._doUpdateRecord(recordIndex, newObj);
      }

      // recalculate totals
      this.columnsToShow.forEach((cl) => {
        this._recalculateColumn(cl, recordToDelete, true);
      });
    }
  }

  _doUndelete(recordIndex) {
    if (recordIndex !== -1) {
      const newObj = {
        isDeleted: false,
        ...ROW_BUTTON_CONFIGURATION.DELETE,
      };

      this._doUpdateRecord(recordIndex, newObj);

      // recalculate totals
      this.columnsToShow.forEach((cl) => {
        this._recalculateColumn(cl, JSON.parse(JSON.stringify(this._tableData[recordIndex])), true);
      });
    }
  }

  _doChangeField(recordIndex, fieldName, value, record) {
    if (recordIndex !== -1) {
      let theValue = value;

      // if it's an array field then it means a multiselect picklist
      if (Array.isArray(theValue)) {
        theValue = theValue.map((vl) => vl.value).join(';');
      }

      const newObj = {
        [fieldName]: theValue,
      };

      this._doUpdateRecord(recordIndex, newObj);

      // recalculate totals if needed
      this._recalculateColumn(
        this.columnsToShow.find((cl) => cl.fieldName === fieldName),
        record,
      );
    }
  }

  _doAddRecord() {
    const newRecord = { ...ROW_BUTTON_CONFIGURATION.DELETE };

    // add the master details configuration if any
    if (this.masterDetailConfiguration) {
      const masterDetailConfigurationParsed = JSON.parse(this.masterDetailConfiguration);

      if (Object.keys(masterDetailConfigurationParsed).length > 0) {
        Object.keys(masterDetailConfigurationParsed).forEach((res) => {
          newRecord[masterDetailConfigurationParsed[res].apiName] = this[res];
        });
      }
    }

    this._allColumns
      .filter((col) => col.type !== ROW_BUTTON_TYPE)
      .forEach((col) => {
        newRecord.isNew = true;
        newRecord._id = generateRandomString();
        newRecord[col.fieldName] = col.typeAttributes.config.defaultValue || '';
      });

    // add the _originalRecord too
    newRecord._originalRecord = {};

    // get the latest row that is not summary or group
    let lastIndex = this._tableData.findLastIndex(
      (dt) => !dt._originalRecord._isGroupRecord && !dt._originalRecord._isSummarizeRecord,
    );

    if (lastIndex !== -1) {
      // add the group Id
      newRecord._groupId = this._tableData[lastIndex]._groupId;

      lastIndex++;
    } else {
      lastIndex = 9999;
    }

    // add to the records to show
    this._doUpdateRecord(lastIndex, newRecord, true);

    this._doUpdateOutputs(newRecord, EVENTS.ADD);

    // check pagination and set current page to last one
    if (this.showPagination) {
      this.handleLastPage();
    }
  }

  _doAddEditWithFlow(record = undefined) {
    const modalProps = {
      size: 'small',
      label: 'Edit or Add from a flow',
    };

    if (!record) {
      // this is an add
      modalProps.flowName = this.addFlowName;

      modalProps.inputVariables = this.addFlowInputVariables ? JSON.parse(this.addFlowInputVariables) : [];
    } else {
      // this is an edit
      modalProps.flowName = this.editFlowName;
      modalProps.inputVariables = this.editFlowInputVariables ? JSON.parse(this.editFlowInputVariables) : [];
    }

    this._doOpenFlow(modalProps, record);
  }

  _doSendToCaller(fieldName, record) {
    const column = this.columnsToShow.find((cl) => cl.fieldName === fieldName);
    this.dispatchEvent(
      new CustomEvent('clickrowbutton', {
        detail: {
          fieldName: fieldName,
          label: column.label || column.tableLabel,
          record: record,
        },
      }),
    );
  }

  async _doOpenFlowButton(fieldName, record, recordsSelected = undefined) {
    const modalProps = {
      size: 'small',
      label: 'Flow Button',
      preview: this.preview,
      currentRecord: record,
    };

    const column = this._allColumns.find((cl) => cl.fieldName === fieldName);
    const selectedIds = recordsSelected ? recordsSelected.map((row) => row._id) : undefined;

    // this is an edit
    modalProps.flowName = column.typeAttributes.config.flowName;
    modalProps.bottomNavFlow = column.typeAttributes.config.showInBottomNav;
    modalProps.inputVariables = column.typeAttributes.config.flowInputVariables
      ? JSON.parse(column.typeAttributes.config.flowInputVariables)
      : [];
    const waitForPlatformEvent = column.typeAttributes.config.waitForPlatformEvent || false;

    const resultModal = await this._doOpenFlow(modalProps, record, selectedIds, waitForPlatformEvent);

    // if something came back from the flow and we have to navigate next
    if (resultModal && resultModal.isSuccess) {
      if (column.typeAttributes.config.flowNavigateNext) {
        // set the outputs for the flow if records selected
        if (recordsSelected) {
          this.rowRecordIds = selectedIds;
        }

        // navigate next
        this._doNavigateNext(fieldName, record);
      } else {
        this._selectedRows = [];
        this.outputSelectedRows = [];
      }
    }
  }

  async _doOpenFlow(modalProps, record = undefined, selectedIds = undefined, waitForPlatformEvent = false) {
    if (record) {
      modalProps.inputVariables.unshift({
        name: 'recordId',
        type: 'String',
        value: record._id,
      });
    }

    if (selectedIds && selectedIds.length > 0) {
      modalProps.inputVariables.unshift({
        name: 'recordIds',
        type: 'String',
        value: selectedIds,
      });
    }

    // open the modal
    const resultModal = await OdDatatableFlow.open(modalProps);

    if (resultModal && resultModal.isSuccess) {
      if (resultModal.flowOutput) {
        if (!Array.isArray(resultModal.flowOutput)) {
          // add or modify the record in the tableData
          const recordIndex = this._tableData.findIndex((rc) => rc._id === resultModal.flowOutput.Id);

          if (recordIndex !== -1) {
            this._doUpdateRecord(recordIndex, resultModal.flowOutput);
          } else {
            // add delete and edit button
            const newRecord = {
              ...ROW_BUTTON_CONFIGURATION.DELETE,
              ...ROW_BUTTON_CONFIGURATION.EDIT,
              _editLabel: this.editLabel,
              ...resultModal.flowOutput,
              _originalRecord: resultModal.flowOutput,
              _id: resultModal.flowOutput.Id,
            };

            this._doUpdateRecord(99999, newRecord);
          }

          this._getAccessAndBuildRecords(this._tableData, true);
        } else {
          // multiple records

          // bulk edition
          if (!resultModal.bottomNavFlow) {
            resultModal.flowOutput.forEach((rec) => {
              // add or modify the record in the tableData
              const recordIndex = this._tableData.findIndex((rc) => rc._id === rec.Id);

              if (recordIndex !== -1) {
                this._doUpdateRecord(recordIndex, rec);
              }
            });
          } else {
            // bottom nav flow, replace all the records
            const newRecords = [];
            resultModal.flowOutput.forEach((rec) => {
              newRecords.push({
                ...rec,
                _id: rec.Id,
                _originalRecord: rec,
                ...ROW_BUTTON_CONFIGURATION.DELETE,
                ...ROW_BUTTON_CONFIGURATION.EDIT,
                _editLabel: this.editLabel,
              });
            });

            this._getAccessAndBuildRecords(newRecords, true);
          }
        }
      }

      // add an extra check on the column configuration
      if (this._listeningToPlatformEvent && waitForPlatformEvent) {
        this.isSaving = true;
        this.savingMessage = 'We are processing the records. Please wait...';
      }
    }

    return resultModal;
  }

  _doGetListOfIdsToRefreshPlatformEvent() {
    let result = [];

    this._tableData.forEach((rec) => {
      if (rec[this.platformEventMatchingFieldName]) {
        result.push(rec[this.platformEventMatchingFieldName]);
      }
    });

    result = [...new Set(result)];

    return result;
  }

  _getFieldsToReturn() {
    // get a list of the fields separated by comma and remove the last comma (move to method)
    let fieldsToReturn = this._allColumns
      .filter(
        (fld) =>
          (fld.typeAttributes && fld.typeAttributes.config && !fld.typeAttributes.config.isCustom) ||
          !fld.typeAttributes ||
          (fld.typeAttributes && !fld.typeAttributes.config),
      )
      .map((fld) => fld.fieldName)
      .join(',');

    fieldsToReturn = fieldsToReturn.endsWith(',') ? fieldsToReturn.slice(0, -1) : fieldsToReturn;

    return fieldsToReturn;
  }

  _doGetUpdatedData() {
    getRecords({
      withSharing: this._withSharing,
      objectName: this.objectName,
      fields: this._getFieldsToReturn(),
      fieldNameFilter: this.platformEventMatchingFieldName,
      idsToQuery: this._doGetListOfIdsToRefreshPlatformEvent(),
    })
      .then((rs) => {
        this.isSaving = false;
        this.savingMessage = ' ';
        this.errorMessage = false;

        // refresh the data in the table and clean the outputs
        this._buildRecords(rs);
      })
      .catch((error) => {
        this.isSaving = false;
        this.errorMessage = reduceErrors(error);
      });
  }

  // =================================================================
  // Group and summarize methods
  // =================================================================
  _groupData(data) {
    // first check if the grouping field is in the dataset
    const fieldInDataSet = data[0].hasOwnProperty(this.groupingField);

    if (!fieldInDataSet) {
      return data;
    }

    // group the data by the field
    let groupedData = {};

    // grouping source is the data
    if (this.groupingSource === GROUPING_SOURCE.DATASET) {
      groupedData = Object.groupBy(data, (dt) => dt[this.groupingField] || '');
    } else {
      // grouping source is the picklist
      this.groupingSourceFieldData.split(',').forEach((value) => {
        groupedData[value] = data.filter((dt) => dt[this.groupingField] === value);
      });

      // add the ones with empty value
      groupedData[''] = data.filter((dt) => !dt[this.groupingField]);
    }

    // Create an array to store group information including summaries
    let groupsWithSummaries = Object.entries(groupedData).map(([group, items]) => {
      const summary = this._showTotalsByGroup ? this._checkAndSummarize(items, group || NO_GROUP) : undefined;
      return {
        group,
        items,
        summary,
      };
    });

    // Sort the groups based on either group name or summary values
    groupsWithSummaries = groupsWithSummaries.sort((a, b) => {
      if (this.groupSortField && this.groupSortField !== this.groupingField) {
        // If sorting by a summary field
        if (a.summary && b.summary) {
          const valueA = a.summary[this.groupSortField];
          const valueB = b.summary[this.groupSortField];

          // Handle empty/null/undefined values
          const isEmptyA = valueA === null || valueA === undefined || valueA === '';
          const isEmptyB = valueB === null || valueB === undefined || valueB === '';

          if (isEmptyA && isEmptyB) return 0;
          if (isEmptyA) return 1;
          if (isEmptyB) return -1;

          // Handle numeric values
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            return this.groupSortDirection === SORT_DIRECTION.ASC.value ? valueA - valueB : valueB - valueA;
          }

          // Handle string values
          return this.groupSortDirection === SORT_DIRECTION.ASC.value
            ? String(valueA).localeCompare(String(valueB))
            : String(valueB).localeCompare(String(valueA));
        }
      } else {
        // Default sorting by group name
        const isEmptyA = !a.group || a.group === '';
        const isEmptyB = !b.group || b.group === '';

        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1;
        if (isEmptyB) return -1;

        return this.groupSortDirection === SORT_DIRECTION.ASC.value
          ? a.group.localeCompare(b.group)
          : b.group.localeCompare(a.group);
      }
    });

    // Sort items within each group if needed
    if (this.groupContentSortField) {
      groupsWithSummaries.forEach((groupData) => {
        groupData.items = sortArrayByProperty(
          groupData.items,
          this.groupContentSortField,
          this.groupContentSortDirection,
        );
      });
    }

    const firstColumnField = this.columnsToShow.find((col) => col.typeAttributes.config.isFirstColumn).fieldName;

    // Flatten the sorted groups back into a single array
    return groupsWithSummaries.reduce((flattened, { group, items, summary }) => {
      if (this.groupingSource === GROUPING_SOURCE.FIELD && this.showEmptyGroups === YES_NO.NO && items.length === 0) {
        return flattened;
      }

      const groupId = group || NO_GROUP;

      // Add the group as an element
      flattened.push({
        _id: `grouping-${groupId}`,
        _groupId: groupId,
        [firstColumnField]: group,
        _originalRecord: {
          _isGroupRecord: true,
          _isCollapsible: this._canCollapseGroups,
        },
      });

      const newItems = items.map((item) => ({
        ...item,
        _groupId: groupId,
      }));

      // Add all items in that group
      flattened.push(...newItems);

      // add the summary row if it exists
      if (summary && newItems.length > 0) {
        flattened.push({ ...summary, _groupId: groupId });
      }

      return flattened;
    }, []);
  }

  _checkAndAddLabelToFirstColumn(record, group, columnFieldName = undefined) {
    let groupToUse = group;
    const firstColumnField = this.columnsToShow.find((col) => col.typeAttributes.config.isFirstColumn).fieldName;

    if (columnFieldName === firstColumnField || !columnFieldName) {
      if (record[firstColumnField]) {
        if (groupToUse === NO_GROUP) {
          groupToUse = ' ';
        }

        if (groupToUse) {
          record[firstColumnField] = `Totals:${SPACES_FOR_TOTALS}${record[firstColumnField]}`;
        } else {
          record[firstColumnField] = `TOTALS:${SPACES_FOR_TOTALS}${record[firstColumnField]}`;
        }
      } else {
        if (groupToUse) {
          record[firstColumnField] = `Totals:`;
        } else {
          record[firstColumnField] = `TOTALS:`;
        }
      }
    }

    return record;
  }

  _checkAndSummarize(data, group = undefined) {
    let result = {};

    this.columnsToShow.forEach((column) => {
      if (column.typeAttributes.config.summarize) {
        const values = data
          .map((row) => row[column.fieldName])
          .filter((value) => value !== '' && value !== null && value !== undefined);

        result[column.fieldName] = this._summarizeColumn(column, values);
      }
    });

    if (Object.keys(result).length > 0) {
      // check and add labels to summarize rows
      result = this._checkAndAddLabelToFirstColumn(result, group);

      return {
        ...result,
        _id: `summarize-${group || 'totals'}`,
        _originalRecord: {
          _isSummarizeRecord: true,
        },
      };
    }

    return undefined;
  }

  _summarizeColumn(column, values) {
    let result;
    switch (column.typeAttributes.config.summarizeType) {
      case 'max':
        result = values.length ? Math.max(...values) : null;
        // For dates
        if (values.length && typeof values[0] === 'string' && values[0].includes('-')) {
          result = values.reduce((max, current) => (current > max ? current : max));
        }
        break;

      case 'min':
        result = values.length ? Math.min(...values) : null;
        // For dates
        if (values.length && typeof values[0] === 'string' && values[0].includes('-')) {
          result = values.reduce((min, current) => (current < min ? current : min));
        }
        break;

      case 'sum':
        result = values.reduce((sum, current) => sum + (Number(current) || 0), 0);
        break;

      case 'avg':
        if (values.length) {
          const sum = values.reduce((acc, current) => acc + (Number(current) || 0), 0);
          result = sum / values.length;
        } else {
          result = 0;
        }
        break;

      case 'count':
        result = `Count: ${values.length.toString()}`;
        break;
    }

    return result;
  }

  _recalculateColumn(column, record, forceRecalculation = false) {
    // only if recalculate live is enabled and is inlineEdit or inlineAdd and new record
    if (this._recalculateLive && (forceRecalculation || this._editInline || (this._addInline && record.isNew))) {
      // if the column is summarizable
      if (column.typeAttributes.config.summarize) {
        const group = record._groupId;

        let newData = JSON.parse(JSON.stringify(this._tableData));

        let rowToUpdateIndex;
        let values;
        let newValue;
        let newObject = {};

        // calculate for group
        if (group) {
          let fromData = true;
          // get the row to update
          if (this._collapsedRecordsByGroupId[group]) {
            fromData = false;
            rowToUpdateIndex = this._collapsedRecordsByGroupId[group].findIndex(
              (row) => row._id === `summarize-${group}`,
            );
          } else {
            rowToUpdateIndex = newData.findIndex((row) => row._id === `summarize-${group}`);
          }

          if (rowToUpdateIndex !== -1) {
            let dataToCalculate = JSON.parse(JSON.stringify(newData));

            // add the collapsed rows too, so we count them in the summaries as they are only "hidden"
            if (Object.keys(this._collapsedRecordsByGroupId).length > 0) {
              dataToCalculate = [...dataToCalculate, ...Object.values(this._collapsedRecordsByGroupId).flat()];
            }

            values = dataToCalculate
              .filter(
                (row) =>
                  row._groupId === group &&
                  !row.isDeleted &&
                  !row._originalRecord._isGroupRecord &&
                  !row._originalRecord._isSummarizeRecord,
              )
              .map((row) => row[column.fieldName])
              .filter((value) => value !== '' && value !== null && value !== undefined);

            // calculate the totals
            newValue = this._summarizeColumn(column, values);

            newObject = {
              [column.fieldName]: newValue,
            };

            // check and add labels to summarize rows
            newObject = this._checkAndAddLabelToFirstColumn(newObject, group, column.fieldName);

            // update the data
            if (fromData) {
              newData = [
                ...newData.slice(0, rowToUpdateIndex),
                {
                  ...newData[rowToUpdateIndex],
                  ...newObject,
                },
                ...newData.slice(rowToUpdateIndex + 1),
              ];
            } else {
              this._doUpdateCollapsedRecords(rowToUpdateIndex, {
                ...this._collapsedRecordsByGroupId[group][rowToUpdateIndex],
                ...newObject,
              });
            }
          }
        }

        // calculate grand totals

        // get the row to update
        rowToUpdateIndex = newData.findIndex((row) => row._id === 'summarize-totals');

        if (rowToUpdateIndex !== -1) {
          let dataToCalculate = JSON.parse(JSON.stringify(newData));

          // add the collapsed rows too, so we count them in the summaries as they are only "hidden"
          if (Object.keys(this._collapsedRecordsByGroupId).length > 0) {
            dataToCalculate = [...dataToCalculate, ...Object.values(this._collapsedRecordsByGroupId).flat()];
          }

          values = dataToCalculate
            .filter(
              (row) => !row.isDeleted && !row._originalRecord._isGroupRecord && !row._originalRecord._isSummarizeRecord,
            )
            .map((row) => row[column.fieldName])
            .filter((value) => value !== '' && value !== null && value !== undefined);

          // calculate the totals
          newValue = this._summarizeColumn(column, values);

          newObject = {
            [column.fieldName]: newValue,
          };

          // check and add labels to summarize rows
          newObject = this._checkAndAddLabelToFirstColumn(newObject, undefined, column.fieldName);

          // update the data
          newData = [
            ...newData.slice(0, rowToUpdateIndex),
            {
              ...newData[rowToUpdateIndex],
              ...newObject,
            },
            ...newData.slice(rowToUpdateIndex + 1),
          ];
        }

        this._tableData = newData;
      }
    }
  }

  _doCollapseGroup(groupId, recordIndex) {
    // collect the records for future expand and calculations
    this._collapsedRecordsByGroupId[groupId] = this._tableData.filter(
      (dt) => dt._groupId === groupId && !dt._originalRecord._isGroupRecord,
    );

    // filter the data shown in the table
    let newData = this._tableData.filter(
      (dt) => dt._groupId !== groupId || (dt._groupId === groupId && dt._originalRecord._isGroupRecord),
    );

    // update the current record as isCollapsed
    newData = [
      ...newData.slice(0, recordIndex),
      {
        ...newData[recordIndex],
        _originalRecord: {
          ...newData[recordIndex]._originalRecord,
          _isCollapsed: true,
        },
      },
      ...newData.slice(recordIndex + 1),
    ];

    this._tableData = newData;
  }

  _doExpandGroup(groupId, recordIndex) {
    // get the elements to add
    const elementsToAdd = this._collapsedRecordsByGroupId[groupId] || [];

    // add the elements to the table data
    let newData = JSON.parse(JSON.stringify(this._tableData));
    newData.splice(recordIndex + 1, 0, ...elementsToAdd);

    // delete from the object that tracks the collapsed sections
    delete this._collapsedRecordsByGroupId[groupId];

    // update the current record as isCollapsed: false
    newData = [
      ...newData.slice(0, recordIndex),
      {
        ...newData[recordIndex],
        _originalRecord: {
          ...newData[recordIndex]._originalRecord,
          _isCollapsed: false,
        },
      },
      ...newData.slice(recordIndex + 1),
    ];

    this._tableData = newData;
  }

  _doUpdateCollapsedRecords(recordIndex, newObj) {
    this._collapsedRecordsByGroupId[newObj._groupId] = [
      ...this._collapsedRecordsByGroupId[newObj._groupId].slice(0, recordIndex),
      {
        ...newObj,
      },
      ...this._collapsedRecordsByGroupId[newObj._groupId].slice(recordIndex + 1),
    ];
  }

  // =================================================================
  // update output methods
  // =================================================================
  _doUpdateOutputs(record, action) {
    switch (action) {
      case EVENTS.DELETE:
        // for new records, search from the outputAddedRows and remove it from there, otherwise, add it to the deleted
        if (record.isNew) {
          const recordAddedIndex = this.outputAddedRows.findIndex((rec) => rec._id === record._id);
          if (recordAddedIndex !== -1) {
            this.outputAddedRows.splice(recordAddedIndex, 1);
          }
        } else {
          this.outputDeletedRows.push(record);
        }
        break;
      case EVENTS.UNDELETE:
        // eslint-disable-next-line no-case-declarations
        const recordDeleteIndex = this.outputDeletedRows.findIndex((rec) => rec._id === record._id);
        if (recordDeleteIndex !== -1) {
          this.outputDeletedRows.splice(recordDeleteIndex, 1);
        }
        break;
      case EVENTS.CHANGE:
        // for new records, search from the outputAddedRows and edit it from there, otherwise, edit it in outputEditedRows
        if (record.isNew) {
          const recordAddedEditIndex = this.outputAddedRows.findIndex((rec) => rec._id === record._id);
          if (recordAddedEditIndex !== -1) {
            this.outputAddedRows[recordAddedEditIndex] = record;
          }
        } else {
          // eslint-disable-next-line no-case-declarations
          const recordEditIndex = this.outputEditedRows.findIndex((rec) => rec._id === record._id);
          if (recordEditIndex !== -1) {
            this.outputEditedRows[recordEditIndex] = record;
          } else {
            this.outputEditedRows.push(record);
          }
        }
        break;
      case EVENTS.ADD:
        this.outputAddedRows.push(record);
        break;
      default:
        break;
    }

    // output the changed flag
    this.wasChanged = true;

    // update all the rows with the _hasChanges
    this._tableData.forEach((rec) => {
      rec._hasChanges = true;
    });

    // update all the collapsed rows too
    Object.keys(this._collapsedRecordsByGroupId).forEach((key) => {
      this._collapsedRecordsByGroupId[key].forEach((rec) => {
        rec._hasChanges = true;
      });
    });

    // dispatch the outputs to parent in case someone is listening to it
    this.dispatchEvent(
      new CustomEvent('changevalues', {
        detail: {
          deleted: JSON.parse(JSON.stringify(this.outputDeletedRows)),
          added: JSON.parse(JSON.stringify(this.outputAddedRows)),
          edited: JSON.parse(JSON.stringify(this.outputEditedRows)),
        },
      }),
    );
  }

  _doCleanOutputs(emptyOutputs = true, cleanHasChanges = true) {
    if (emptyOutputs) {
      this.saveAndNext = false;
      this.rowRecordId = null;
      this.rowButtonClicked = null;
    }

    this.outputAddedRows = [];
    this.outputDeletedRows = [];
    this.outputEditedRows = [];

    this._collapsedRecordsByGroupId = {};

    if (cleanHasChanges) {
      this.wasChanged = false;

      // update all the rows with the _hasChanges
      this._tableData.forEach((rec) => {
        rec._hasChanges = false;
      });

      Object.keys(this._collapsedRecordsByGroupId).forEach((key) => {
        this._collapsedRecordsByGroupId[key].forEach((rec) => {
          rec._hasChanges = false;
        });
      });
    }

    this._doRemoveSessionStorage();
  }

  // =================================================================
  // Save methods
  // =================================================================
  _doRefreshDataAfterSave(records = [], deletedRecords = []) {
    const newRecords = [];

    const dataWithCollapsed = this._tableData;

    // add the collapsed rows too, so we count them in the summaries as they are only "hidden"
    if (Object.keys(this._collapsedRecordsByGroupId).length > 0) {
      dataWithCollapsed.push(...Object.values(this._collapsedRecordsByGroupId).flat());
    }

    // this is for updates and deletes
    dataWithCollapsed.forEach((rec) => {
      const recordIndexEdit = records.findIndex((rc) => rec._id === rc.Id);
      const recordIndexDelete = deletedRecords.findIndex((rc) => rec._id === rc._id);

      // update
      if (recordIndexEdit !== -1) {
        newRecords.push(records[recordIndexEdit]);
      } else if (recordIndexDelete === -1 && !rec.isNew) {
        newRecords.push(rec);
      }
    });

    // for new records
    records.forEach((rec) => {
      const recordIndexNew = newRecords.findIndex((rc) => rec.Id === rc.Id);

      if (recordIndexNew === -1) {
        newRecords.push(rec);
      }
    });

    // clean the outputs
    this._doCleanOutputs(false);

    // build the new set of records
    this._buildRecords(newRecords, true);

    // if save and next is enabled, navigate to next screen
    if (this._navigateNextAfterSave) {
      this.saveAndNext = true;

      // navigate to the next screen
      this._doNavigateNext();
    }
  }

  _doCleanDataToSave(data) {
    const copyData = JSON.parse(JSON.stringify(data));

    copyData.forEach((record) => {
      Object.keys(record).forEach((key) => {
        if (/^_/.test(key)) {
          delete record[key];
        }
      });
    });

    return copyData;
  }

  _doDispatchAfterSave(records) {
    this.dispatchEvent(
      new CustomEvent('aftersave', {
        detail: {
          recordIds: records.map((record) => ({ recordId: record.Id })),
        },
      }),
    );
  }

  // =================================================================
  // Navigate methods
  // =================================================================
  _doNavigateBack() {
    if (this.availableActions.find((action) => action === 'BACK')) {
      const navigateBackEvent = new FlowNavigationBackEvent();
      this.dispatchEvent(navigateBackEvent);
    }
  }

  _doNavigateNext(fieldName = undefined, record = {}) {
    if (this.availableActions.find((action) => action === 'NEXT')) {
      if (fieldName) {
        const column = this._allColumns.find((cl) => cl.fieldName === fieldName);

        if (record) {
          this.rowRecordId = record._id;
          this.rowRecord = record;
        }

        this.rowButtonClicked = column.typeAttributes.label;
      }

      const navigateNextEvent = new FlowNavigationNextEvent();
      this.dispatchEvent(navigateNextEvent);
    }
  }

  // =================================================================
  // Export methods
  // =================================================================
  _buildCSVContent() {
    const csvRows = [];

    const columnsToExport = this.columnsToShow.filter((col) => col.type !== ROW_BUTTON_TYPE);

    // add the headers from the columns
    const headers = [];
    columnsToExport.forEach((cl) => {
      headers.push(
        (cl.label || cl.tableLabel)
          .replace('* ', '')
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .replace(/\s+/g, '_'),
      );
    });

    // add the reference (Id)
    headers.push('ID');

    // add the extra column if needed
    if (this._doExportGroups) {
      headers.unshift('Group_Name');
    }

    csvRows.push(headers.join(','));

    // add the data now
    JSON.parse(JSON.stringify(this._tableData))
      .filter((rec) => !rec._originalRecord._isSummarizeRecord && !rec._originalRecord._isGroupRecord)
      .forEach((rec) => {
        // build the row
        const row = columnsToExport.map((e) => {
          let value = rec[e.fieldName];

          if (value) {
            // Escape double quotes and wrap in quotes if contains comma or newline
            if (value.toString().includes(',') || value.toString().includes('\n') || value.toString().includes('"')) {
              value = '"' + value.toString().replace(/"/g, '""') + '"';
            }
          }

          return value;
        });

        if (rec._groupId && this._doExportGroups) {
          row.unshift(rec._groupId);
        }

        // add the id at the end
        row.push(rec.Id);

        csvRows.push(row.join(','));
      });

    return csvRows.join('\n');
  }

  _downloadCSV(data) {
    const fileName = `${this._hasExportFileName ? this.exportFileName : 'dataExport'}.csv`;

    if (window.navigator.msSaveOrOpenBlob) {
      const blob = new Blob([data]);
      window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
      const charBom = '\uFEFF';
      const encodedData = encodeURIComponent(data);
      const content = `data:text/csv;charset=utf-8,${charBom}${encodedData}`;

      const link = document.createElement('a');
      link.setAttribute('href', content);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);

      link.click();
    }
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleSelectRow(event) {
    if (event.detail.config.action) {
      // if it's not a selectAllRows and not a deselectAllRows
      if (event.detail.config.action !== 'selectAllRows' && event.detail.config.action !== 'deselectAllRows') {
        if (event.detail.config.action === 'rowSelect') {
          // if it's single selection, remove all the others
          if (this._isSingleSelection) {
            this._selectedRows = [];
          }

          event.detail.selectedRows.forEach((selRow) => {
            if (!this._selectedRows.find((rec) => rec._id === selRow._id)) {
              const row = this._tableData.find((rec) => rec._id === selRow._id);

              // add the selected row first
              this._selectedRows.push(row);

              // if it is a group record being selected
              if (row._originalRecord._isGroupRecord) {
                // select the children, based on the collapsed flag
                if (row._originalRecord._isCollapsed) {
                  this._collapsedRecordsByGroupId[row._groupId].forEach((rec) => {
                    this._selectedRows.push(rec);
                  });
                } else {
                  this._tableData
                    .filter((rec) => rec._groupId === row._groupId && rec._id !== row._id)
                    .forEach((rec) => {
                      this._selectedRows.push(rec);
                    });
                }
              } else {
                // check if for that group there is any other that is not group or summarize, otherwise mark the group and summarize too
                if (
                  this._tableData.filter(
                    (rec) =>
                      rec._groupId === row._groupId &&
                      !rec.isDeleted &&
                      !rec._originalRecord._isGroupRecord &&
                      !rec._originalRecord._isSummarizeRecord &&
                      !this._selectedRows.find((rc) => rc._id === rec._id) &&
                      rec._id !== row._id,
                  ).length === 0
                ) {
                  this._tableData
                    .filter(
                      (rec) =>
                        rec._groupId === row._groupId &&
                        rec._id !== row._id &&
                        !this._selectedRows.find((rc) => rc._id === rec._id) &&
                        (rec._originalRecord._isGroupRecord || rec._originalRecord._isSummarizeRecord),
                    )
                    .forEach((rec) => {
                      this._selectedRows.push(rec);
                    });
                }
              }
            }
          });
        } else if (event.detail.config.action === 'rowDeselect') {
          const row = this._tableData.find((rec) => rec._id === event.detail.config.value);

          // remove the unselected row first
          this._selectedRows = this._selectedRows.filter((rec) => rec._id !== row._id);

          if (row._originalRecord._isGroupRecord) {
            this._selectedRows = this._selectedRows.filter((rec) => rec._groupId !== row._groupId);
          } else {
            // check if for that group there is any other that is not group or summarize, otherwise filter them
            if (
              this._selectedRows.filter(
                (rec) =>
                  rec._groupId === row._groupId &&
                  !rec._originalRecord._isGroupRecord &&
                  !rec._originalRecord._isSummarizeRecord,
              ).length === 0
            ) {
              this._selectedRows = this._selectedRows.filter((rec) => rec._groupId !== row._groupId);
            }
          }
        }
      } else if (event.detail.config.action === 'selectAllRows') {
        // add all the rows from the table data that are not deleted
        this._tableData
          .filter((rec) => !rec.isDeleted)
          .forEach((rec) => {
            this._selectedRows.push(rec);
          });

        // add from the collapsed rows too
        Object.keys(this._collapsedRecordsByGroupId).forEach((key) => {
          this._collapsedRecordsByGroupId[key]
            .filter((rec) => !rec.isDeleted)
            .forEach((rec) => {
              this._selectedRows.push(rec);
            });
        });
      } else if (event.detail.config.action === 'deselectAllRows') {
        this._selectedRows = [];
      }

      this.outputSelectedRows = JSON.parse(JSON.stringify(this._selectedRows)).filter(
        (rec) => !rec._originalRecord._isGroupRecord && !rec._originalRecord._isSummarizeRecord,
      );
    }
  }

  @api
  handleRowAction(event) {
    const action = event.detail.action;
    const recordId = event.detail.recordId;
    const fieldName = event.detail.fieldName;
    const value = event.detail.value;
    const isValid = event.detail.isValid;

    const recordIndex = this._tableData.findIndex((rc) => rc._id === recordId);
    // doing it here as if we delete, then we don't have that index anymore (if it's new)
    let record = this._tableData[recordIndex];

    let updateOutputs = true;

    switch (action) {
      case EVENTS.DELETE:
        this._doDelete(recordIndex);

        if (!record.isNew) {
          // reassigning the record here, for the new values
          record = this._tableData[recordIndex];
        }

        break;
      case EVENTS.UNDELETE:
        this._doUndelete(recordIndex);

        // reassigning the record here, for the new values
        record = this._tableData[recordIndex];

        break;
      case EVENTS.CHANGE:
        if (this._editWithFlow) {
          updateOutputs = false;
          this._doAddEditWithFlow(record);
        } else {
          this._doChangeField(recordIndex, fieldName, value, record);

          // add to the valid invalids
          this._validInvalidFields[`${recordId}-${fieldName}`] = isValid;

          // reassigning the record here, for the new values
          record = this._tableData[recordIndex];
        }

        break;
      case EVENTS.OPEN_FLOW:
        this._doOpenFlowButton(fieldName, record);
        break;
      case EVENTS.SEND_TO_CALLER:
        updateOutputs = false;

        this._doSendToCaller(fieldName, record);
        break;
      case EVENTS.NAVIGATE_NEXT:
        updateOutputs = false;

        this._doNavigateNext(fieldName, record);
        break;
      case EVENTS.NAVIGATE_BACK:
        updateOutputs = false;

        this._doNavigateBack();
        break;
      case EVENTS.GROUP_COLLAPSE:
        updateOutputs = false;

        this._doCollapseGroup(record._groupId, recordIndex);
        break;
      case EVENTS.GROUP_EXPAND:
        updateOutputs = false;

        this._doExpandGroup(record._groupId, recordIndex);
        break;
      default:
        break;
    }

    if (updateOutputs) {
      // update the outputs
      this._doUpdateOutputs(record, action);
    }
  }

  handleHeaderAction(event) {
    if (
      event.detail.action.type === HEADER_ACTION_TYPES.SET_VALUE &&
      event.detail.columnDefinition.typeAttributes.editable
    ) {
      this._tableData
        .filter((rec) => !rec.isDeleted)
        .forEach((rec) => {
          this.handleRowAction({
            detail: {
              action: EVENTS.CHANGE,
              recordId: rec._id,
              fieldName: event.detail.columnDefinition.fieldName,
              value: event.detail.action.valueToSet,
              isValid: true,
            },
          });
        });
    }
  }

  handleAdd() {
    // add the record to the table with the defaults if inline, otherwise open the flow to add
    if (this._addWithFlow) {
      this._doAddEditWithFlow();
    } else {
      this._doAddRecord();
    }
  }

  handleBulkDelete() {
    const recordsAvailable = JSON.parse(JSON.stringify(this._tableData));

    this._selectedRowsToProcessBulk.forEach((row) => {
      let record;
      let recordIndex = recordsAvailable.findIndex((rc) => rc._id === row._id);

      // found in the table data
      if (recordIndex !== -1) {
        this._doDelete(recordIndex);
        record = recordsAvailable[recordIndex];
      } else {
        // check in the collapsed groups
        recordIndex = this._collapsedRecordsByGroupId[row._groupId].findIndex((rc) => rc._id === row._id);
        if (recordIndex !== -1) {
          record = this._collapsedRecordsByGroupId[row._groupId][recordIndex];
          if (record.isNew) {
            this._collapsedRecordsByGroupId[row._groupId] = [
              ...this._collapsedRecordsByGroupId[row._groupId].slice(0, recordIndex),
              ...this._collapsedRecordsByGroupId[row._groupId].slice(recordIndex + 1),
            ];
          } else {
            record = {
              ...record,
              isDeleted: true,
              ...ROW_BUTTON_CONFIGURATION.UNDELETE,
            };

            this._doUpdateCollapsedRecords(recordIndex, record);

            // recalculate totals if needed
            this.columnsToShow.forEach((cl) => {
              this._recalculateColumn(cl, record, true);
            });
          }
        }
      }

      // update the outputs
      this._doUpdateOutputs(record, EVENTS.DELETE);
    });

    this._selectedRows = [];

    this.outputSelectedRows = [];
  }

  handleOpenBulkEdit() {
    this.showBulkEditPopup = true;
  }

  handleCloseBulkEdit() {
    this.showBulkEditPopup = false;
  }

  handleBulkEditRows(event) {
    const onlyEmpty = event.detail.onlyEmpty;
    const fieldsToUpdate = event.detail.fields;

    // for each selected row, update the corresponding fields if necessary
    this._selectedRowsToProcessBulk.forEach((row) => {
      fieldsToUpdate.forEach((fl) => {
        // check the the id is not the same as the value (to prevent cycle for parent relationships)
        if (row._id !== fl.value) {
          // check the if only empty
          if ((onlyEmpty && !row[fl.fieldName]) || !onlyEmpty) {
            // update the data if in the table or collapsed
            if (this._tableData.find((rc) => rc._id === row._id)) {
              const detail = {
                action: EVENTS.CHANGE,
                recordId: row._id,
                fieldName: fl.fieldName,
                value: fl.value,
                isValid: fl.isValid,
              };

              this.handleRowAction({ detail });
            } else {
              const recordIndex = this._collapsedRecordsByGroupId[row._groupId].findIndex((rc) => rc._id === row._id);
              const record = {
                ...this._collapsedRecordsByGroupId[row._groupId][recordIndex],
                [fl.fieldName]: fl.value,
              };
              this._doUpdateCollapsedRecords(recordIndex, record);

              // recalculate totals if needed
              this._recalculateColumn(
                this.columnsToShow.find((cl) => cl.fieldName === fl.fieldName),
                record,
              );

              // update the outputs
              this._doUpdateOutputs(record, EVENTS.CHANGE);
            }
          }
        }
      });
    });
    this._selectedRows = [];

    this.outputSelectedRows = [];

    this.handleCloseBulkEdit();
  }

  @api
  handleCancel(e) {
    e.preventDefault();
    e.stopPropagation();

    this._doCleanOutputs();

    this._buildRecords(this._originalTableData);
  }

  handleSave(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.preview) {
      this._doCleanOutputs();
      return;
    }

    this.isSaving = true;

    // validate
    const validate = this.validate();

    if (validate.isValid) {
      // delete it from the storage
      this._doRemoveSessionStorage();

      const recordsToCreate = this._doCleanDataToSave(this.outputAddedRows);
      const recordsToEdit = this._doCleanDataToSave(this.outputEditedRows);
      const recordsToDelete = this._doCleanDataToSave(this.outputDeletedRows);

      saveRecords({
        withSharing: this._withSharing,
        objectName: this.objectName,
        fields: this._getFieldsToReturn(),
        recordsToCreate: JSON.stringify(recordsToCreate),
        recordsToUpdate: JSON.stringify(recordsToEdit),
        recordsToDelete: JSON.stringify(recordsToDelete),
      })
        .then((rs) => {
          this.isSaving = false;
          this.errorMessage = false;

          // refresh the data in the table and clean the outputs
          this._doRefreshDataAfterSave(rs, this.outputDeletedRows);

          // dispatch the after save in case this is being used inside a lightning record page with the ids of the impacted rows
          this._doDispatchAfterSave([...rs, ...this.outputDeletedRows]);
        })
        .catch((error) => {
          this.isSaving = false;
          this.errorMessage = reduceErrors(error);
        });
    } else {
      // navigate to the next screen to trigger validations
      this.isSaving = false;
      this._doNavigateNext();
    }
  }

  handleOpenBulkFlow(event) {
    this._doOpenFlowButton(event.target.dataset.name, undefined, this._selectedRowsToProcessBulk);
  }

  handleOpenBottomNavFlow(event) {
    this._doOpenFlowButton(event.target.dataset.name, undefined);
  }

  handlePrevPage() {
    this.currentPage--;
  }

  handleNextPage() {
    this.currentPage++;
  }

  handleFirstPage() {
    this.currentPage = 0;
  }

  handleLastPage() {
    this.currentPage = this.totalPages - 1;
  }

  handleChangePage(e) {
    this.currentPage = parseInt(e.target.dataset.value, 10);
  }

  handleExport() {
    const csvContent = this._buildCSVContent();

    this._downloadCSV(csvContent);
  }
}
