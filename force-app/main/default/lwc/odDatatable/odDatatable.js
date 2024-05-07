import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import { subscribe, unsubscribe } from 'lightning/empApi';
import CSSStyles from '@salesforce/resourceUrl/OD_DatatableCSS';
import getFieldsForObject from '@salesforce/apex/OD_ConfigurationEditorController.getFieldsForObject';
import saveRecords from '@salesforce/apex/OD_ConfigurationEditorController.saveRecords';
import getRecords from '@salesforce/apex/OD_ConfigurationEditorController.getRecords';
import {
  YES_NO,
  EMPTY_STRING,
  EVENTS,
  ROW_BUTTON_CONFIGURATION,
  INLINE_FLOW,
  PLATFORM_EVENT_CHANNEL_NAME,
  ROW_BUTTON_TYPE,
} from 'c/odDatatableConstants';
import { reduceErrors, getFieldType, getPrecision, generateRandomNumber } from 'c/odDatatableUtils';
import OdDatatableFlow from 'c/odDatatableFlow';

export default class ODDatatable extends LightningElement {
  // internal use
  @api uniqueTableName;

  // flow
  @api availableActions = [];

  // table configuration
  @api objectName;
  @api tableData = [];
  @api columns;
  @api noRecordsMessage;

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

  // save
  @api inlineSave;
  @api saveLabel = 'Save';
  @api navigateNextAfterSave;

  // platform event
  @api listenToPlatformEvent;
  @api platformEventMatchingFieldName;
  @api platformEventMatchingId;

  // outputs
  @api saveAndNext = false;
  @api outputAddedRows = [];
  @api outputEditedRows = [];
  @api outputDeletedRows = [];
  @api rowRecordId;
  @api rowRecordIds;
  @api rowButtonClicked;

  @track columnsToShow = [];
  @track columnsForBulkEdit = [];
  @track recordsToShow = [];
  @track selectedRowsIds = [];

  isLoading = true;
  errorMessage = false;
  isSaving = false;
  savingMessage = ' ';

  fieldsThatChanged = [];

  showBulkEditPopup = false;

  _allColumns = [];
  _validInvalidFields = {};
  afterValidate = false;
  _selectedRows = [];

  // platform event
  _subscription;

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
        this.recordsToShow.every((rec) => {
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
    Promise.all([loadStyle(this, CSSStyles)]);

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
  @wire(getFieldsForObject, { objectName: '$objectName' })
  _getFields(result) {
    if (result.data) {
      this.isLoading = false;

      // build the columns
      this._buildColumns(result.data);

      // build the records
      this._buildRecords(this.tableData);

      // clean the output variables
      this._doCleanOutputs();
    } else if (result.error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(result.error);
    }
  }

  // =================================================================
  // getter methods
  // =================================================================
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

  get notBulkOperation() {
    return this.canBulkDelete === YES_NO.NO && this.canBulkEdit === YES_NO.NO && this.otherBulkFlowButtons.length === 0;
  }

  get bulkOperationDisabled() {
    return this._selectedRows.length === 0 || this.hasChanges;
  }

  get showBulkEditButton() {
    return this.canBulkEdit === YES_NO.YES;
  }

  get bulkEditHasLabel() {
    return this.bulkEditLabel && this.bulkEditLabel !== EMPTY_STRING;
  }

  get _editWithFlow() {
    return this.canEdit === YES_NO.YES && this.editType === INLINE_FLOW.FLOW;
  }

  get _addWithFlow() {
    return this.canAdd === YES_NO.YES && this.addType === INLINE_FLOW.FLOW;
  }

  get isInlineSave() {
    return this.inlineSave === YES_NO.YES;
  }

  get hasChanges() {
    return (
      (this.outputAddedRows.length > 0 || this.outputDeletedRows.length > 0 || this.outputEditedRows.length > 0) &&
      this.recordsToShow.filter((rec) => rec._hasChanges).length > 0
    );
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

  get _listeningToPlatformEvent() {
    return this.listenToPlatformEvent === YES_NO.YES;
  }

  // =================================================================
  // private methods
  // =================================================================
  _getSessionStoredVariables() {
    if (sessionStorage[this._storageTag]) {
      const result = JSON.parse(sessionStorage[this._storageTag]);

      if (result) {
        this.outputAddedRows = result.added || [];
        this.outputEditedRows = result.edited || [];
        this.outputDeletedRows = result.deleted || [];

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

  _buildRecords(data) {
    let result = [];

    JSON.parse(JSON.stringify(data)).forEach((rec) => {
      // if this record is in the stored session one use the stored one (for when we validate and back to the same page)
      const indexEdited = this.outputEditedRows.findIndex((ed) => ed._id === rec.Id);
      const indexDeleted = this.outputDeletedRows.findIndex((dl) => dl._id === rec.Id);

      if (indexEdited !== -1) {
        result.push(this.outputEditedRows[indexEdited]);
      } else if (indexDeleted !== -1) {
        result.push(this.outputDeletedRows[indexDeleted]);
      } else {
        let record = {
          ...rec,
          _id: rec.Id,
          _originalRecord: rec,
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
    if (this.outputAddedRows.length > 0) {
      result = result.concat(this.outputAddedRows);
    }

    this.recordsToShow = result;
  }

  _buildColumns(columnsFromObject) {
    const columnsConfiguration = JSON.parse(this.columns);

    // add the after validate to all the columns
    if (this.afterValidate) {
      columnsConfiguration.forEach((col) => {
        col.typeAttributes.config.afterValidate = true;
      });
    }

    // set editable to all false if the whole table is not editable or if the edit type is NO (which means flow)
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
        cellAttributes: { alignment: 'center' },
        typeAttributes: {
          recordId: { fieldName: '_id' },
          name: { fieldName: '_editAction' },
          label: { fieldName: '_editLabel' },
          isDeleted: { fieldName: 'isDeleted' },
          hasChanges: { fieldName: '_hasChanges' },
        },
      });
    }

    // add an extra column to the end if we have the option to delete
    if (this.canDelete === YES_NO.YES) {
      columnsConfiguration.push({
        type: ROW_BUTTON_TYPE,
        initialWidth: 50,
        hideDefaultActions: true,
        cellAttributes: { alignment: 'center' },
        typeAttributes: {
          recordId: { fieldName: '_id' },
          iconName: { fieldName: '_deleteIcon' },
          tooltip: { fieldName: '_deleteTooltip' },
          name: { fieldName: '_deleteAction' },
          hasChanges: { fieldName: '_hasChanges' },
          isDeleted: { fieldName: 'isDeleted' },
        },
      });
    }

    this._allColumns = columnsConfiguration;
    this.columnsToShow = columnsConfiguration.filter(
      (col) => (col.typeAttributes.config && !col.typeAttributes.config.hidden) || !col.typeAttributes.config,
    );
  }

  _doUpdateRecord(recordIndex, newObject) {
    this.recordsToShow = [
      ...this.recordsToShow.slice(0, recordIndex),
      {
        ...this.recordsToShow[recordIndex],
        ...newObject,
      },
      ...this.recordsToShow.slice(recordIndex + 1),
    ];
  }

  _doDelete(recordIndex) {
    if (recordIndex !== -1) {
      // if it's a new add, delete the record from the collection
      if (this.recordsToShow[recordIndex].isNew) {
        // if it's the last one just do an assignment, otherwise do the slice for the second part
        if (recordIndex === this.recordsToShow.length - 1) {
          this.recordsToShow = this.recordsToShow.slice(0, recordIndex);
        } else {
          this.recordsToShow = [
            ...this.recordsToShow.slice(0, recordIndex),
            ...this.recordsToShow.slice(recordIndex + 1),
          ];
        }
      } else {
        const newObj = {
          isDeleted: true,
          ...ROW_BUTTON_CONFIGURATION.UNDELETE,
        };

        this._doUpdateRecord(recordIndex, newObj);
      }
    }
  }

  _doUndelete(recordIndex) {
    if (recordIndex !== -1) {
      const newObj = {
        isDeleted: false,
        ...ROW_BUTTON_CONFIGURATION.DELETE,
      };

      this._doUpdateRecord(recordIndex, newObj);
    }
  }

  _doChangeField(recordIndex, fieldName, value) {
    if (recordIndex !== -1) {
      const newObj = {
        [fieldName]: value,
      };

      this._doUpdateRecord(recordIndex, newObj);
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
        newRecord._id = generateRandomNumber();
        newRecord[col.fieldName] = col.typeAttributes.config.defaultValue || '';
      });

    // add to the records to show
    this._doUpdateRecord(99999, newRecord);

    this._doUpdateOutputs(newRecord, EVENTS.ADD);
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

  async _doOpenFlowButton(fieldName, record, selectedIds = undefined) {
    const modalProps = {
      size: 'small',
      label: 'Flow Button',
    };

    const column = this._allColumns.find((cl) => cl.fieldName === fieldName);

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
        // set the outputs
        this.rowRecordId = record ? record._id : undefined;
        this.rowRecordIds = selectedIds;
        this.rowButtonClicked = record ? column.typeAttributes.label : column.typeAttributes.config.bulkButtonLabel;

        // navigate next
        this._doNavigateNext();
      } else {
        this._selectedRows = [];
        this.selectedRowsIds = [];
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
          const recordIndex = this.recordsToShow.findIndex((rc) => rc._id === resultModal.flowOutput.Id);

          if (recordIndex !== -1) {
            this._doUpdateRecord(recordIndex, resultModal.flowOutput);
          } else {
            // add delete and edit button
            const newRecord = {
              ...ROW_BUTTON_CONFIGURATION.DELETE,
              ...ROW_BUTTON_CONFIGURATION.EDIT,
              _editLabel: this.editLabel,
              ...resultModal.flowOutput,
              _id: resultModal.flowOutput.Id,
            };

            this._doUpdateRecord(99999, newRecord);
          }
        } else {
          // multiple records

          // bulk edition
          if (!resultModal.bottomNavFlow) {
            resultModal.flowOutput.forEach((rec) => {
              // add or modify the record in the tableData
              const recordIndex = this.recordsToShow.findIndex((rc) => rc._id === rec.Id);

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

            this.recordsToShow = newRecords;
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

    this.recordsToShow.forEach((rec) => {
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

    // update all the rows with the _hasChanges
    this.recordsToShow.forEach((rec) => {
      rec._hasChanges = true;
    });
  }

  _doCleanOutputs(emptyOutputs = true) {
    if (emptyOutputs) {
      this.saveAndNext = false;
      this.rowRecordId = null;
      this.rowButtonClicked = null;
      this.outputAddedRows = [];
      this.outputDeletedRows = [];
      this.outputEditedRows = [];
    }

    // update all the rows with the _hasChanges
    this.recordsToShow.forEach((rec) => {
      rec._hasChanges = false;
    });

    this._doRemoveSessionStorage();
  }

  _doRefreshDataAfterSave(records = [], deletedRecords = []) {
    const newRecords = [];

    // this is for updates and deletes
    this.recordsToShow.forEach((rec) => {
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
    this._buildRecords(newRecords);

    // if save and next is enabled, navigate to next screen
    if (this.navigateNextAfterSave === YES_NO.YES) {
      this.saveAndNext = true;

      // navigate to the next screen
      this._doNavigateNext();
    }
  }

  _doCleanDataToSend(data) {
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

  _doNavigateNext() {
    if (this.availableActions.find((action) => action === 'NEXT')) {
      const navigateNextEvent = new FlowNavigationNextEvent();
      this.dispatchEvent(navigateNextEvent);
    }
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleSelectRow(event) {
    this._selectedRows = [];
    event.detail.selectedRows.forEach((sr) => {
      if (!sr.isDeleted) {
        this._selectedRows.push(sr);
      }
    });

    this.selectedRowsIds = this._selectedRows.map((sr) => sr._id);
  }

  handleRowAction(event) {
    const action = event.detail.action;
    const recordId = event.detail.recordId;
    const fieldName = event.detail.fieldName;
    const value = event.detail.value;
    const isValid = event.detail.isValid;

    const recordIndex = this.recordsToShow.findIndex((rc) => rc._id === recordId);
    // doing it here as if we delete, then we don't have that index anymore (if it's new)
    let record = this.recordsToShow[recordIndex];

    switch (action) {
      case EVENTS.DELETE:
        this._doDelete(recordIndex);

        if (!record.isNew) {
          // reassigning the record here, for the new values
          record = this.recordsToShow[recordIndex];
        }

        break;
      case EVENTS.UNDELETE:
        this._doUndelete(recordIndex);

        // reassigning the record here, for the new values
        record = this.recordsToShow[recordIndex];

        break;
      case EVENTS.CHANGE:
        if (this._editWithFlow) {
          this._doAddEditWithFlow(record);
        } else {
          this._doChangeField(recordIndex, fieldName, value);

          // add to the valid invalids
          this._validInvalidFields[`${recordId}-${fieldName}`] = isValid;

          // reassigning the record here, for the new values
          record = this.recordsToShow[recordIndex];
        }

        break;
      case EVENTS.OPEN_FLOW:
        this._doOpenFlowButton(fieldName, record);
        break;
      default:
        break;
    }

    if (!this._editWithFlow) {
      // update the outputs
      this._doUpdateOutputs(record, action);
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
    const recordsAvailable = JSON.parse(JSON.stringify(this.recordsToShow));
    this._selectedRows.forEach((row) => {
      const recordIndex = recordsAvailable.findIndex((rc) => rc._id === row._id);

      this._doDelete(recordIndex);

      // update the outputs
      this._doUpdateOutputs(recordsAvailable[recordIndex], EVENTS.DELETE);
    });
    this._selectedRows = [];
    this.selectedRowsIds = [];
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
    this._selectedRows.forEach((row) => {
      fieldsToUpdate.forEach((fl) => {
        // check the the id is not the same as the value (to prevent cycle for parent relationships)
        if (row._id !== fl.value) {
          // check the if only empty
          if ((onlyEmpty && !row[fl.fieldName]) || !onlyEmpty) {
            const detail = {
              action: EVENTS.CHANGE,
              recordId: row._id,
              fieldName: fl.fieldName,
              value: fl.value,
              isValid: fl.isValid,
            };

            this.handleRowAction({ detail });
          }
        }
      });
    });
    this._selectedRows = [];
    this.selectedRowsIds = [];

    this.handleCloseBulkEdit();
  }

  handleCancel() {
    this._doCleanOutputs();

    this._buildRecords(this.tableData);
  }

  handleSave() {
    this.isSaving = true;

    // validate
    const validate = this.validate();

    if (validate.isValid) {
      // delete it from the storage
      this._doRemoveSessionStorage();

      saveRecords({
        objectName: this.objectName,
        fields: this._getFieldsToReturn(),
        recordsToCreate: JSON.stringify(this._doCleanDataToSend(this.outputAddedRows)),
        recordsToUpdate: JSON.stringify(this._doCleanDataToSend(this.outputEditedRows)),
        recordsToDelete: JSON.stringify(this._doCleanDataToSend(this.outputDeletedRows)),
      })
        .then((rs) => {
          this.isSaving = false;
          this.errorMessage = false;

          // refresh the data in the table and clean the outputs
          this._doRefreshDataAfterSave(rs, this.outputDeletedRows);
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
    this._doOpenFlowButton(event.target.dataset.name, undefined, this.selectedRowsIds);
  }

  handleOpenBottomNavFlow(event) {
    this._doOpenFlowButton(event.target.dataset.name, undefined);
  }
}
