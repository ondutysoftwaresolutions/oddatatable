import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import CSSStyles from '@salesforce/resourceUrl/OD_DatatableCSS';
import getFieldsForObject from '@salesforce/apex/OD_ConfigurationEditorController.getFieldsForObject';
import { YES_NO, EMPTY_STRING, EVENTS, DELETE_ICONS_CONFIGURATION } from 'c/odDatatableConstants';
import { reduceErrors, getFieldType, getPrecision } from 'c/odDatatableUtils';

const ROW_BUTTON_TYPE = 'rowButtonType';

export default class ODDatatable extends LightningElement {
  // internal use
  @api uniqueTableName;
  @api objectName;

  // table structure
  @api tableData = [];
  @api columns;

  // table configuration
  @api canAdd;
  @api addLabel = 'Add';
  @api canEdit;
  @api canDelete;
  @api canBulkDelete;
  @api bulkDeleteLabel = 'Delete';

  // outputs
  @api outputAddedRows = [];
  @api outputEditedRows = [];
  @api outputDeletedRows = [];

  @track columnsToShow = [];
  @track recordsToShow = [];
  @track selectedRowsIds = [];

  isLoading = true;
  errorMessage = false;

  fieldsThatChanged = [];

  _validInvalidFields = {};
  afterValidate = false;
  _selectedRows = [];

  // =================================================================
  // validate flow method
  // =================================================================
  @api
  validate() {
    let isValid = true;

    // check if there is at least one non valid, return the error
    if (Object.values(this._validInvalidFields).some((fa) => !fa)) {
      isValid = false;
    }

    if (isValid) {
      // check the required fields with value, return false on the first one (this is for fields that are required but not navigated to them)
      this.columnsToShow.every((col) => {
        this.recordsToShow.every((rec) => {
          if (col.typeAttributes.required && !rec[col.fieldName]) {
            isValid = false;
            return false;
          }
          return true;
        });
        return isValid;
      });
    }

    // if it's not valid, set the data in the cache
    if (!isValid) {
      this._setSessionStorage();
    }

    return {
      isValid,
      errorMessage: isValid ? '' : 'Please review the errors in the table to be able to continue',
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
      this._buildRecords();
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

  get notBulkDelete() {
    return this.canBulkDelete === YES_NO.NO;
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

  get bulkDeleteDisabled() {
    return this._selectedRows.length === 0;
  }

  get bulkDeleteHasLabel() {
    return this.bulkDeleteLabel && this.bulkDeleteLabel !== EMPTY_STRING;
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

  _buildRecords() {
    let result = [];

    JSON.parse(JSON.stringify(this.tableData)).forEach((rec) => {
      // if this record is in the stored session one use the stored one (for when we validate and back to the same page)
      const indexEdited = this.outputEditedRows.findIndex((ed) => ed._id === rec.Id);
      const indexDeleted = this.outputDeletedRows.findIndex((dl) => dl._id === rec.Id);

      if (indexEdited !== -1) {
        result.push(this.outputEditedRows[indexEdited]);
      } else if (indexDeleted !== -1) {
        result.push(this.outputDeletedRows[indexDeleted]);
      } else {
        result.push({
          ...rec,
          _id: rec.Id,
          ...DELETE_ICONS_CONFIGURATION.DELETE,
        });
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

    // set editable to all false if the whole table is not editable
    if (this.canEdit === YES_NO.NO) {
      columnsConfiguration.forEach((col) => {
        col.typeAttributes.editable = false;
      });
    }

    // check if some of the columns changed the type/precision/scale/digits and/or maxlength
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
    });

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
        },
      });
    }

    this.columnsToShow = columnsConfiguration;
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
          ...DELETE_ICONS_CONFIGURATION.UNDELETE,
        };

        this._doUpdateRecord(recordIndex, newObj);
      }
    }
  }

  _doUndelete(recordIndex) {
    if (recordIndex !== -1) {
      const newObj = {
        isDeleted: false,
        ...DELETE_ICONS_CONFIGURATION.DELETE,
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
    const newRecord = { ...DELETE_ICONS_CONFIGURATION.DELETE };

    this.columnsToShow
      .filter((col) => col.type !== ROW_BUTTON_TYPE)
      .forEach((col) => {
        newRecord.isNew = true;
        newRecord._id = Math.random().toString(36).slice(2, 12);
        newRecord[col.fieldName] = col.typeAttributes.config.defaultValue || '';
      });

    // add to the records to show
    this._doUpdateRecord(99999, newRecord);

    this._doUpdateOutputs(newRecord, EVENTS.ADD);
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
    // doing it here as if we delete, then we don't have that index anymore
    let record = this.recordsToShow[recordIndex];

    switch (action) {
      case EVENTS.DELETE:
        this._doDelete(recordIndex);
        break;
      case EVENTS.UNDELETE:
        this._doUndelete(recordIndex);
        break;
      case EVENTS.CHANGE:
        this._doChangeField(recordIndex, fieldName, value);

        // add to the valid invalids
        this._validInvalidFields[`${recordId}-${fieldName}`] = isValid;

        // reassigning the record here, for the new values
        record = this.recordsToShow[recordIndex];

        break;
      default:
        break;
    }

    // update the outputs
    this._doUpdateOutputs(record, action);
  }

  handleAdd() {
    // add the record to the table with the defaults
    this._doAddRecord();
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
}
