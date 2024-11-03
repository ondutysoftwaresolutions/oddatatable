import { LightningElement, api, track } from 'lwc';
import { getPopupHeight, getBodyPopupClasses } from 'c/odDatatableUtils';
import { FIELD_TYPES, FLOW_DATA_TYPES } from 'c/odDatatableConstants';
import { generateRandomNumber } from 'c/odDatatableUtils';

export default class OdDatatableConfigurationFlowInputVariables extends LightningElement {
  @api objectName;
  @api type;
  @api inputs;
  @api builderContext;
  @api single = false;
  @api multiple = false;
  @api bottomNav = false;

  @track inputsToDisplayTable = [];

  availableTypes = FLOW_DATA_TYPES;

  hasChanged = false;
  errorMessage = false;
  fieldTypes = FIELD_TYPES;
  popupHeight;

  // private variables
  _alreadyRendered = false;

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    this._buildRecords();
  }

  renderedCallback() {
    if (!this._alreadyRendered) {
      const bodyRendered = this.template.querySelector('.body-popup');

      if (bodyRendered) {
        this._alreadyRendered = true;
        this.popupHeight = getPopupHeight(this);
      }
    }
  }

  // =================================================================
  // getters methods
  // =================================================================
  get bodyClasses() {
    return `slds-p-around--large ${getBodyPopupClasses(this)}`;
  }

  get multipleObjectName() {
    return `${this.objectName}[]`;
  }

  get isEdit() {
    return this.type === 'editFlowInputVariables';
  }

  get disabledSave() {
    let disabled = false;

    if (this.hasChanged) {
      if (this.errorMessage) {
        disabled = true;
      } else {
        this.inputsToDisplayTable.forEach((input) => {
          if (!input.name || !input.type || (!input.value && !input.fixedValue)) {
            disabled = true;
          }
        });
      }
    } else {
      disabled = true;
    }

    return disabled;
  }

  // =================================================================
  // private methods
  // =================================================================
  _buildRecords() {
    const result = [];
    if (this.inputs) {
      const inputs = JSON.parse(this.inputs);

      if (inputs.length > 0) {
        inputs.forEach((input) => {
          result.push({
            ...input,
            id: generateRandomNumber(),
            availableValues: this._buildValueOptions(input.type),
          });
        });

        this.inputsToDisplayTable = result;
      }
    }
  }

  _buildValueOptions(type) {
    const result = [];

    // variables
    const variables = this.builderContext.variables;
    if (variables.length > 0) {
      const variablesPerType = variables.filter((vr) => vr.dataType.toLowerCase() === type.toLowerCase());

      if (variablesPerType.length > 0) {
        variablesPerType.forEach((vpo) => {
          result.push({
            label: vpo.name,
            value: `{!${vpo.name}}`,
          });
        });
      }
    }

    // formulas
    const formulas = this.builderContext.formulas;
    if (formulas.length > 0) {
      const formulasPerType = formulas.filter((fml) => fml.dataType.toLowerCase() === type.toLowerCase());

      if (formulasPerType.length > 0) {
        formulasPerType.forEach((fml) => {
          result.push({
            label: fml.name,
            value: `{!${fml.name}}`,
          });
        });
      }
    }

    // constants
    const constants = this.builderContext.constants;
    if (constants.length > 0) {
      const constantsPerType = constants.filter((cnt) => cnt.dataType.toLowerCase() === type.toLowerCase());

      if (constantsPerType.length > 0) {
        constantsPerType.forEach((cnt) => {
          result.push({
            label: cnt.name,
            value: `{!${cnt.name}}`,
          });
        });
      }
    }

    return result;
  }

  _doUpdateField(id, objectToUpdate) {
    const inputIndex = this.inputsToDisplayTable.findIndex((fl) => fl.id === id);
    this.inputsToDisplayTable[inputIndex] = {
      ...this.inputsToDisplayTable[inputIndex],
      ...objectToUpdate,
    };

    this.hasChanged = true;
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleTypeOnFocusDropdown(e) {
    const id = e.target.dataset.id;

    this.inputsToDisplayTable.forEach((fl) => {
      if (fl.id === id) {
        fl.typeOpened = true;
      } else {
        fl.typeOpened = false;
      }
    });
  }

  handleTypeOnBlurDropdown() {
    this.inputsToDisplayTable.forEach((fl) => {
      fl.typeOpened = false;
    });
  }

  handleValueOnFocusDropdown(e) {
    const id = e.target.dataset.id;

    this.inputsToDisplayTable.forEach((fl) => {
      if (fl.id === id) {
        fl.valueOpened = true;
        fl.availableValues = this._buildValueOptions(fl.type);
      } else {
        fl.valueOpened = false;
      }
    });
  }

  handleValueOnBlurDropdown() {
    this.inputsToDisplayTable.forEach((fl) => {
      fl.valueOpened = false;
    });
  }

  handleAdd() {
    this.inputsToDisplayTable.push({
      id: generateRandomNumber(),
      name: '',
      type: '',
      value: '',
      fixedValue: '',
      showEmptyValueOptions: false,
      availableValues: [],
    });

    this.hasChanged = true;
  }

  handleUpdateName(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    // check there is not another input with same name
    if (
      (value === 'recordId' && !this.bottomNav && this.isEdit) ||
      this.inputsToDisplayTable.some((input) => input.name === value)
    ) {
      this.errorMessage = 'There is already another input with the same name.';
    } else {
      this.errorMessage = false;
    }

    this._doUpdateField(id, { [fieldName]: value, ...other });
  }

  handleUpdateFixedValue(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    this._doUpdateField(id, { [fieldName]: value, ...other });
  }

  handleUpdateType(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    // build the options for the value
    const valueOptions = this._buildValueOptions(value);

    this._doUpdateField(id, {
      [fieldName]: value,
      showEmptyValueOptions: valueOptions.length === 0,
      ...other,
      availableValues: valueOptions,
    });
  }

  handleUpdateValue(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    this._doUpdateField(id, { [fieldName]: value, ...other });
  }

  handleDelete(event) {
    const id = event.target.dataset.id;

    const inputIndex = this.inputsToDisplayTable.findIndex((fl) => fl.id === id);

    this.inputsToDisplayTable = [
      ...this.inputsToDisplayTable.slice(0, inputIndex),
      ...this.inputsToDisplayTable.slice(inputIndex + 1),
    ];

    this.hasChanged = true;
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    const result = [];

    this.inputsToDisplayTable.forEach((input) => {
      const { name, type, value, fixedValue } = input;

      result.push({ name, type, value, fixedValue });
    });

    // dispatch the save
    const event = new CustomEvent('save', { detail: { value: JSON.stringify(result) } });

    this.dispatchEvent(event);
  }
}
