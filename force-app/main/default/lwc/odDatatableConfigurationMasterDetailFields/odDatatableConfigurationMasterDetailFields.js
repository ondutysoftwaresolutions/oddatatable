import { LightningElement, api, wire, track } from 'lwc';
import getMasterDetailFieldsForObject from '@salesforce/apex/OD_DatatableConfigurationController.getMasterDetailFieldsForObject';
import { reduceErrors, getPopupHeight, getBodyPopupClasses } from 'c/odDatatableUtils';
import { FIELD_TYPES } from 'c/odDatatableConstants';

export default class OdDatatableConfigurationMasterDetailFields extends LightningElement {
  @api objectName;
  @api configuration;
  @api context;

  @track fieldsToDisplayTable = [];
  @track fields = [];

  selectedFields = [];
  popupHeight;
  isSelectFieldsOpened = false;
  isLoading = true;
  loadingMessage = 'Getting the fields. Please wait...';
  errorMessage = false;
  fieldTypes = FIELD_TYPES;

  // private variables
  _alreadyRendered = false;

  // =================================================================
  // lifecycle methods
  // =================================================================
  renderedCallback() {
    if (!this._alreadyRendered && !this.isLoading) {
      const bodyRendered = this.template.querySelector('.body-popup');

      if (bodyRendered) {
        this._alreadyRendered = true;
        this.popupHeight = getPopupHeight(this);
      }
    }
  }

  // =================================================================
  // wire methods
  // =================================================================
  @wire(getMasterDetailFieldsForObject, { objectName: '$objectName' })
  _getFields({ error, data }) {
    if (data) {
      this.isLoading = false;

      if (data.length > 0) {
        this.fields = JSON.parse(JSON.stringify(data));

        this._selectFields();
      } else {
        this.errorMessage = `We couldn't find any Master-Detail field in the ${this.objectName} object`;
      }
    } else if (error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(error);
    }
  }

  // =================================================================
  // getters methods
  // =================================================================
  get disabledSave() {
    if (this.selectedFields.length === 0) {
      return true;
    }

    return this.fieldsToDisplayTable.some((sf) => !sf.defaultValue);
  }

  get bodyClasses() {
    return `slds-p-around--large ${getBodyPopupClasses(this)}`;
  }

  get options() {
    const result = [];

    // add the constants
    if (this.context.constants.length > 0) {
      this.context.constants
        .filter((cnt) => cnt.dataType.toLowerCase() === FIELD_TYPES.STRING)
        .forEach((cnt) => {
          result.push({
            label: `Constant: ${cnt.name}`,
            value: cnt.name,
          });
        });
    }

    // add the formulas
    if (this.context.formulas.length > 0) {
      this.context.formulas
        .filter((cnt) => cnt.dataType.toLowerCase() === FIELD_TYPES.STRING)
        .forEach((cnt) => {
          result.push({
            label: `Formula: ${cnt.name}`,
            value: cnt.name,
          });
        });
    }

    // add the variables
    if (this.context.variables.length > 0) {
      this.context.variables
        .filter((cnt) => cnt.dataType.toLowerCase() === FIELD_TYPES.STRING)
        .forEach((cnt) => {
          result.push({
            label: `Variable: ${cnt.name}`,
            value: cnt.name,
          });
        });
    }

    return result;
  }

  // =================================================================
  // private methods
  // =================================================================
  _selectFields() {
    const parsedConfiguration = this.configuration ? JSON.parse(this.configuration) : [];
    const result = [];

    Object.keys(parsedConfiguration).forEach((col) => {
      // get the field from the fields api
      const fieldIndex = this.fields.findIndex((fl) => fl.value === parsedConfiguration[col].apiName);

      // get the field
      const field = this.fields[fieldIndex];

      if (fieldIndex !== -1) {
        result.push({
          ...field,
          apiName: parsedConfiguration[col].apiName,
          lastIndex: parsedConfiguration[col].lastIndex,
          nameProp: col,
          defaultValue: parsedConfiguration[col].defaultValue || '',
        });
      }
    });

    this.selectedFields = result;
    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  _buildSelectedFields(fields) {
    const filteredFields = fields.filter((fl) => fl.lastIndex);
    let lastIndex = 0;

    if (filteredFields.length > 0) {
      lastIndex = Math.max(...filteredFields.map((fl) => fl.lastIndex));
    }

    fields
      .filter((fl) => !fl.nameProp)
      .forEach((fl) => {
        fl.apiName = fl.value;
        fl.nameProp = `masterDetailField${lastIndex + 1}`;
        fl.lastIndex = lastIndex + 1;
        fl.defaultValue = fl.defaultValue || '';
      });

    return fields;
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleOnFocusDropdown() {
    this.isSelectFieldsOpened = true;
  }

  handleOnBlurDropdown() {
    this.isSelectFieldsOpened = false;
  }

  handleValueOnFocusDropdown(e) {
    const apiName = e.target.dataset.value;

    this.fieldsToDisplayTable.forEach((fl) => {
      if (fl.apiName === apiName) {
        fl.opened = true;
      } else {
        fl.opened = false;
      }
    });
  }

  handleValueOnBlurDropdown() {
    this.fieldsToDisplayTable.forEach((fl) => {
      fl.opened = false;
    });
  }

  handleSelectField(event) {
    if (event.detail.value.length > 2) {
      this.errorMessage = 'There can be only 2 Master-Detail fields for each object.';
    } else {
      this.selectedFields = this._buildSelectedFields(event.detail.value);

      this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
    }
  }

  handleUpdateField(event) {
    const { fieldName, value, ...other } = event.detail;
    const fieldAPIName = event.target.dataset.value;

    // update the right field in the arrays
    // selected fields array
    const fieldIndexSelected = this.selectedFields.findIndex((fl) => fl.apiName === fieldAPIName);
    this.selectedFields[fieldIndexSelected] = {
      ...this.selectedFields[fieldIndexSelected],
      [fieldName]: value,
      ...other,
    };

    // fields to display table array
    const fieldIndexTable = this.fieldsToDisplayTable.findIndex((fl) => fl.apiName === fieldAPIName);
    this.fieldsToDisplayTable[fieldIndexTable] = {
      ...this.fieldsToDisplayTable[fieldIndexTable],
      [fieldName]: value,
      ...other,
    };
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    const result = {};

    this.fieldsToDisplayTable.forEach((field) => {
      result[field.nameProp] = {
        defaultValue: field.defaultValue,
        apiName: field.apiName,
        lastIndex: field.lastIndex,
      };
    });

    // dispatch the save
    const event = new CustomEvent('save', { detail: { value: JSON.stringify(result) } });

    this.dispatchEvent(event);
  }
}
