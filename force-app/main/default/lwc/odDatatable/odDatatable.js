import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import CSSStyles from '@salesforce/resourceUrl/OD_DatatableCSS';
import getFieldsForObject from '@salesforce/apex/OD_ConfigurationEditorController.getFieldsForObject';
import saveRecords from '@salesforce/apex/OD_ConfigurationEditorController.saveRecords';
import { YES_NO, EMPTY_STRING, EVENTS, ROW_BUTTON_CONFIGURATION, INLINE_FLOW } from 'c/odDatatableConstants';
import { reduceErrors, getFieldType, getPrecision, generateRandomNumber } from 'c/odDatatableUtils';
import OdDatatableFlow from 'c/odDatatableFlow';

const ROW_BUTTON_TYPE = 'rowButtonType';

export default class ODDatatable extends LightningElement {
  // internal use
  @api uniqueTableName;

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

  // outputs
  @api outputAddedRows = [];
  @api outputEditedRows = [];
  @api outputDeletedRows = [];

  @track columnsToShow = [];
  @track columnsForBulkEdit = [];
  @track recordsToShow = [];
  @track selectedRowsIds = [];

  isLoading = true;
  errorMessage = false;
  isSaving = false;

  fieldsThatChanged = [];

  showBulkEditPopup = false;

  _allColumns = [];
  _validInvalidFields = {};
  afterValidate = false;
  _selectedRows = [];
  _alreadyRendered = false;

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
          if (col.typeAttributes.editable && col.typeAttributes.required && !rec[col.fieldName]) {
            isValid = false;
            return false;
          }
          return true;
        });

        return isValid;
      });

      // check the save if it's inline
      if (this.isInlineSave && this.hasChanges) {
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

    // get the variables from the session storage if any
    this._getSessionStoredVariables();
  }

  renderedCallback() {
    if (!this._alreadyRendered && !this.isLoading) {
      const tableRendered = this.template.querySelector('.od-datatable');

      if (tableRendered) {
        this._alreadyRendered = true;
        this._addInsidePopupHeightToColumns(tableRendered);
      }
    }
  }

  // =================================================================
  // wire methods
  // =================================================================
  @wire(getFieldsForObject, { objectName: '$objectName' })
  _getFields({ error, data }) {
    if (data) {
      this.isLoading = false;

      // build the columns
      this._buildColumns(data);

      // build the records
      this._buildRecords(this.tableData);
    } else if (error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(error);
    }
  }

  // =================================================================
  // getter methods
  // =================================================================
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
    return this.canBulkDelete === YES_NO.NO && this.canBulkEdit === YES_NO.NO;
  }

  get bulkOperationDisabled() {
    return this._selectedRows.length === 0;
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
    return this.outputAddedRows.length > 0 || this.outputDeletedRows.length > 0 || this.outputEditedRows.length > 0;
  }

  get showSaveButtons() {
    return this.hasChanges && this.isInlineSave;
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
        sessionStorage.removeItem(this._storageTag);
      }
    }
  }

  _setSessionStorage() {
    const objectToSave = {
      added: this.outputAddedRows,
      edited: this.outputEditedRows,
      deleted: this.outputDeletedRows,
    };
    sessionStorage[this._storageTag] = JSON.stringify(objectToSave);
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
          ...ROW_BUTTON_CONFIGURATION.DELETE,
        };

        if (this._editWithFlow) {
          record = {
            ...record,
            ...ROW_BUTTON_CONFIGURATION.EDIT,
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

  _addInsidePopupHeightToColumns(datatableElement) {
    if (datatableElement) {
      const wrapperBody = datatableElement.closest('#wrapper-body');

      if (wrapperBody) {
        const clientRect = wrapperBody.getBoundingClientRect();

        // add the height of the popup to all the columns
        this.columnsToShow.forEach((col) => {
          col.typeAttributes.config.insidePopupHeight = clientRect.height;
        });
      }
    }
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
        this.columnsForBulkEdit.push({
          label: col.tableLabel,
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
        });
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
          disableIfDeleted: true,
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

  async _doOpenFlow(record = undefined) {
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

      modalProps.inputVariables.unshift({
        name: 'recordId',
        type: 'String',
        value: record._id,
      });
    }

    // open the modal
    const resultModal = await OdDatatableFlow.open(modalProps);

    if (resultModal) {
      // add or modify the record in the tableData
      const recordIndex = this.recordsToShow.findIndex((rc) => rc._id === resultModal.Id);

      if (recordIndex !== -1) {
        this._doUpdateRecord(recordIndex, resultModal);
      } else {
        // add delete and edit button
        const newRecord = {
          ...ROW_BUTTON_CONFIGURATION.DELETE,
          ...ROW_BUTTON_CONFIGURATION.EDIT,
          ...resultModal,
          _id: resultModal.Id,
        };

        this._doUpdateRecord(99999, newRecord);
      }
    }
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
  }

  _doCleanOutputs() {
    this.outputAddedRows = [];
    this.outputDeletedRows = [];
    this.outputEditedRows = [];
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
    this._doCleanOutputs();

    // build the new set of records
    this._buildRecords(newRecords);
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
          this._doOpenFlow(record);
        } else {
          this._doChangeField(recordIndex, fieldName, value);

          // add to the valid invalids
          this._validInvalidFields[`${recordId}-${fieldName}`] = isValid;

          // reassigning the record here, for the new values
          record = this.recordsToShow[recordIndex];
        }

        break;
      default:
        break;
    }

    // update the outputs
    this._doUpdateOutputs(record, action);
  }

  handleAdd() {
    // add the record to the table with the defaults if inline, otherwise open the flow to add
    if (this._addWithFlow) {
      this._doOpenFlow();
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

    saveRecords({
      objectName: this.objectName,
      recordsToCreate: JSON.stringify(this.outputAddedRows),
      recordsToUpdate: JSON.stringify(this.outputEditedRows),
      recordsToDelete: JSON.stringify(this.outputDeletedRows),
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
  }
}
