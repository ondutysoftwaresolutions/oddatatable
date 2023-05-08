import { LightningElement, api, track, wire } from 'lwc';
import getObjects from '@salesforce/apex/OD_ConfigurationEditorController.getObjects';
import { FIELD_TYPES, YES_NO, EMPTY_STRING } from 'c/odDatatableConstants';
import { reduceErrors } from 'c/odDatatableUtils';

export default class OdConfigurationEditor extends LightningElement {
  @api genericTypeMappings;
  @api builderContext;

  @track objectTypes = [];

  fieldTypes = FIELD_TYPES;
  yesNo = YES_NO;
  isLoading = true;
  objectDropdownOpened = false;
  dataSourceOpened = false;
  showConfigureColumns = false;
  errorMessage = false;

  _inputVariables = [];

  @track inputValues = {
    tableData: {
      label: 'Data Source Record Collection',
      type: FIELD_TYPES.SELECT,
      valueType: 'reference',
      helpText: 'Record Collection variable containing the records to display in the datatable.',
    },
    columns: {
      label: 'Columns',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      required: true,
      helpText: 'JSON string with the columns to display in the datatable.',
    },
    canAdd: {
      label: 'Can Add?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText:
        "This will add a flag 'isNew' to the record and you will need to write these back to the Object with a Record Insert in the Flow.",
    },
    addLabel: {
      label: 'Add Label',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'Add',
      canBeEmpty: true,
      helpText: 'Label to show in the Add button, if empty, it will only show the icon.',
    },
    canEdit: {
      label: 'Can Edit?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText:
        "This will add a flag 'isEdited' to the record and you will need to write these back to the Object with a Record Update in the Flow.",
    },
    canDelete: {
      label: 'Can Delete?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText:
        "This will add a flag 'isDeleted' to the record and you will need to write these back to the Object with a Record Delete in the Flow.",
    },
    canBulkDelete: {
      label: 'Can Bulk Delete?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      linked: {
        field: 'canDelete',
        on: YES_NO.YES,
      },
      helpText:
        "Add a selection and a button to delete several at one time. This will add a flag 'isDeleted' to the record and you will need to write these back to the Object with a Record Delete in the Flow.",
    },
    bulkDeleteLabel: {
      label: 'Bulk Delete Label',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'Delete',
      canBeEmpty: true,
      helpText: 'Label to show in the Bulk Delete button, if empty, it will only show the icon.',
    },
    // internal use
    uniqueTableName: {
      label: 'Unique Table Name',
      type: FIELD_TYPES.TEXT,
      value: Math.random().toString(36).slice(2, 10),
      valueType: FIELD_TYPES.STRING,
    },
    objectName: {
      label: 'API Object Name',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
    },
  };

  // =================================================================
  // wire methods
  // =================================================================
  @wire(getObjects)
  _getObjects({ error, data }) {
    if (data) {
      this.isLoading = false;
      this.objectTypes = data;
    } else if (error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(error);
    }
  }

  // =================================================================
  // validate flow configuration
  // =================================================================
  @api
  validate() {
    const validity = [];

    // columns
    if (!this.inputValues.columns.value) {
      validity.push({
        key: 'columns',
        errorString: 'You must select at least one column.',
      });
    }

    return validity;
  }

  // =================================================================
  // getter for inputs
  // =================================================================
  @api
  get inputVariables() {
    return this._inputVariables;
  }

  get inputType() {
    const type = this.genericTypeMappings.find(({ typeName }) => typeName === 'T');
    return type && type.typeValue;
  }

  get dataCollectionOptions() {
    const result = [
      {
        label: '-- Select data source --',
        value: '',
      },
    ];

    // first add the variables if any
    const variables = this.builderContext.variables;
    if (variables.length > 0) {
      const variablesPerObject = variables.filter(
        (vr) => vr.objectType === this.inputType && vr.isCollection && vr.dataType === 'SObject',
      );

      if (variablesPerObject.length > 0) {
        variablesPerObject.forEach((vpo) => {
          result.push({
            label: vpo.name,
            value: vpo.name,
          });
        });
      }
    }

    // second add the record lookups for the same object
    const recordLookups = this.builderContext.recordLookups;
    if (recordLookups.length > 0) {
      const lookupRecordsPerObject = recordLookups.filter((lr) => lr.object === this.inputType);

      if (lookupRecordsPerObject.length > 0) {
        lookupRecordsPerObject.forEach((lro) => {
          result.push({
            label: lro.label,
            value: lro.name,
          });
        });
      }
    }

    return result;
  }

  // =================================================================
  // setter for inputs
  // =================================================================
  // Set the fields with the data that was stored from the flow.
  set inputVariables(variables) {
    this._inputVariables = variables || [];
    this._initializeValues();
  }

  // =================================================================
  // getter methods
  // =================================================================
  get isObjectSelected() {
    return this.inputType && !this.isLoading;
  }

  get canAdd() {
    return this.inputValues.canAdd.value === YES_NO.YES;
  }

  get canBulkDelete() {
    return this.inputValues.canBulkDelete.value === YES_NO.YES;
  }

  get canDeleteEditable() {
    return !this.canBulkDelete;
  }

  // =================================================================
  // private methods
  // =================================================================
  _initializeValues() {
    // initialise from previous saves
    this._inputVariables.forEach((input) => {
      if (input.name && input.value != null) {
        if (this.inputValues[input.name] != null) {
          this.inputValues[input.name].value = input.value === EMPTY_STRING ? '' : input.value;
        }
      }
    });

    // trigger the changes for the default values
    Object.keys(this.inputValues).forEach((key) => {
      // get the one from variables
      const variable = this._inputVariables.find((vr) => vr.name === key);

      if (this.inputValues[key].value !== undefined && ((variable && variable.value === undefined) || !variable)) {
        const detail = {
          name: key,
          newValue: this.inputValues[key].value,
          newValueDataType: this.inputValues[key].valueType,
        };

        this._doDispatchChange(detail);
      }
    });
  }

  _doDispatchChange(detail) {
    const valueChangedEvent = new CustomEvent('configuration_editor_input_value_changed', {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    });
    this.dispatchEvent(valueChangedEvent);
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleOnFocusDropdown() {
    this.objectDropdownOpened = true;
  }

  handleOnBlurDropdown() {
    this.objectDropdownOpened = false;
  }

  handleDataOnFocusDropdown() {
    this.dataSourceOpened = true;
  }

  handleDataOnBlurDropdown() {
    this.dataSourceOpened = false;
  }

  handleInputChange(event) {
    if (event && event.detail) {
      const inputValue = this.inputValues[event.detail.fieldName];
      let value = event.detail.value;

      if (inputValue.canBeEmpty && !value) {
        value = EMPTY_STRING;
      }

      // dispatch the change
      const detail = {
        name: event.detail.fieldName,
        newValue: value ? value : null,
        newValueDataType: inputValue.valueType,
      };

      this._doDispatchChange(detail);

      // if we have a linked element, dispatch that too with the same value
      if (inputValue.linked) {
        const linkedValue = this.inputValues[inputValue.linked.field];

        // only if they are of the same type and the condition is met (or no condition)
        if (
          linkedValue.type === inputValue.type &&
          ((inputValue.linked.on && inputValue.linked.on === value) || !inputValue.linked.on)
        ) {
          // dispatch the change
          const detailLinked = {
            name: inputValue.linked.field,
            newValue: value,
            newValueDataType: linkedValue.valueType,
          };

          this._doDispatchChange(detailLinked);
        }
      }
    }
  }

  handleInputTypeChange(event) {
    if (event && event.detail) {
      const newValue = event.detail.value;
      const typeChangedEvent = new CustomEvent('configuration_editor_generic_type_mapping_changed', {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          typeName: 'T',
          typeValue: newValue,
        },
      });
      this.dispatchEvent(typeChangedEvent);

      // dispatch to clean columns and also to clean the data collection
      this.handleSaveColumnsConfiguration({ detail: { value: '' } });
      this.handleInputChange({ detail: { fieldName: 'tableData', value: null } });

      // trigger the change for the object name
      this._doDispatchChange({
        name: 'objectName',
        newValue: newValue,
        newValueDataType: 'string',
      });
    }
  }

  handleOpenColumnsConfigurator() {
    this.showConfigureColumns = true;
  }

  handleCloseColumnsConfigurator() {
    this.showConfigureColumns = false;
  }

  handleSaveColumnsConfiguration(event) {
    if (event && event.detail) {
      const detail = {
        name: 'columns',
        newValue: event.detail.value,
        newValueDataType: 'string',
      };

      this._doDispatchChange(detail);

      this.handleCloseColumnsConfigurator();
    }
  }
}
