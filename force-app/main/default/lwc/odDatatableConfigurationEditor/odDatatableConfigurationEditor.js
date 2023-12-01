import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import CSSStyles from '@salesforce/resourceUrl/OD_DatatableCSS';
import getConfiguration from '@salesforce/apex/OD_ConfigurationEditorController.getConfiguration';
import { FIELD_TYPES, YES_NO, EMPTY_STRING, INLINE_FLOW } from 'c/odDatatableConstants';
import { reduceErrors, generateRandomNumber } from 'c/odDatatableUtils';

export default class OdConfigurationEditor extends LightningElement {
  @api genericTypeMappings;
  @api builderContext;

  @track objectTypes = [];
  @track flows = [];

  // constants
  fieldTypes = FIELD_TYPES;
  yesNo = YES_NO;
  inlineFlow = INLINE_FLOW;

  // state
  isLoading = true;
  errorMessage = false;

  // dropdowns
  @track dropdowns = {
    objectName: false,
    tableData: false,
    addFlowName: false,
    editFlowName: false,
  };

  inlineFlowOptions = [
    {
      label: INLINE_FLOW.INLINE,
      value: INLINE_FLOW.INLINE,
    },
    {
      label: INLINE_FLOW.FLOW,
      value: INLINE_FLOW.FLOW,
    },
  ];

  // popups
  showConfigureColumns = false;
  showConfigureMasterDetailFields = false;
  showFlowInputVariables = false;

  // flow inputs
  flowInputVariablesType;
  flowInputs;

  // private
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
    noRecordsMessage: {
      label: 'No Records Message',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'No Records Found',
      helpText: 'Message to display instead of the datatable if there are no records.',
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
    addType: {
      label: 'Add Type',
      type: FIELD_TYPES.RADIO_BUTTON_TYPE,
      valueType: FIELD_TYPES.STRING,
      value: INLINE_FLOW.INLINE,
      helpText: 'Specify wether you want to be able to add the data directly in the table (Inline) or with a Flow.',
    },
    addFlowName: {
      label: 'Flow Name',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: '',
      helpText:
        "Screen flow name to fire whenever the add button is clicked. A 'recordOutput' SObject record Output variable is needed",
    },
    addFlowInputVariables: {
      label: 'Flow Input Variables',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText: 'JSON string with the input variables to send to the flow.',
    },
    canEdit: {
      label: 'Can Edit?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText:
        "This will add a flag 'isEdited' to the record and you will need to write these back to the Object with a Record Update in the Flow.",
    },
    editType: {
      label: 'Edit Type',
      type: FIELD_TYPES.RADIO_BUTTON_TYPE,
      valueType: FIELD_TYPES.STRING,
      value: INLINE_FLOW.INLINE,
      linked: [
        {
          field: 'canBulkEdit',
          on: INLINE_FLOW.FLOW,
          value: YES_NO.NO,
        },
        {
          field: 'addType',
          on: INLINE_FLOW.FLOW,
        },
      ],
      helpText:
        'Specify wether you want to be able to edit the data directly in the table (Inline) or with a Flow. If Edit is with a flow, then Add must be with a Flow',
    },
    editLabel: {
      label: 'Edit Label',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'Edit',
      helpText: 'Label to show in the Edit button when Editing with a flow.',
    },

    editFlowName: {
      label: 'Flow Name',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: '',
      helpText:
        "Screen flow name to fire whenever the edit button in the row is clicked.  A 'recordId' Input Variable and a 'recordOutput' SObject record Output variable are needed",
    },
    editFlowInputVariables: {
      label: 'Flow Input Variables',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText: 'JSON string with the input variables to send to the flow.',
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
      linked: [
        {
          field: 'canDelete',
          on: YES_NO.YES,
        },
      ],
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
    canBulkEdit: {
      label: 'Can Bulk Edit?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      linked: [
        {
          field: 'canEdit',
          on: YES_NO.YES,
        },
      ],
      helpText:
        'Add a selection and a button to edit several lines at one time. This will add the record to the outputEditedRows and you will need to write these back to the Object with a Record Update in the Flow.',
    },
    bulkEditLabel: {
      label: 'Bulk Edit Label',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'Bulk Edit',
      canBeEmpty: true,
      helpText: 'Label to show in the Bulk Edit button, if empty, it will only show the icon.',
    },
    inlineSave: {
      label: 'Save Enabled?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled, a Save button will appear in the table to be able to save the changes. If disabled the outputs will be send back to the flow and the user will need to do the saving.',
    },
    saveLabel: {
      label: 'Save Label',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: 'Save',
      canBeEmpty: true,
      helpText: 'Label to show in the Save button if inline save is enabled.',
    },
    navigateNextAfterSave: {
      label: 'Navigate Next after Save?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        "If enabled, after clicking Save it will execute the Next button navigation of the screen and it will output the variable 'saveAndNext' = true.",
    },

    // internal use
    uniqueTableName: {
      label: 'Unique Table Name',
      type: FIELD_TYPES.TEXT,
      value: generateRandomNumber(36, 2, 10),
      valueType: FIELD_TYPES.STRING,
    },
    objectName: {
      label: 'API Object Name',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
    },
    isMasterDetail: {
      label: 'Is Master-Detail?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'Is this the detail object on a Master-Detail relationship?. If so, you will need to specify the fields and the values for the parent/s.',
    },
    masterDetailConfiguration: {
      label: 'Master-Detail Configuration',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText: 'JSON string with the columns and values for the master detail relationships',
    },
    masterDetailField1: {
      label: 'First Master-Detail Field',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
    },
    masterDetailField2: {
      label: 'Second Master-Detail Field',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
    },
  };

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    Promise.all([loadStyle(this, CSSStyles)]);
  }

  // =================================================================
  // wire methods
  // =================================================================
  @wire(getConfiguration)
  _getConfiguration({ error, data }) {
    if (data) {
      this.isLoading = false;
      this.objectTypes = data.objects;
      this.flows = data.flows;
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

    // check flow names if flow add
    if (
      this.inputValues.canAdd.value === YES_NO.YES &&
      this.inputValues.addType.value === INLINE_FLOW.FLOW &&
      !this.inputValues.addFlowName.value
    ) {
      validity.push({
        key: 'addFlowName',
        errorString: 'You must select a Flow if Add Type is Flow',
      });
    }

    // check flow names if flow edit
    if (
      this.inputValues.canEdit.value === YES_NO.YES &&
      this.inputValues.editType.value === INLINE_FLOW.FLOW &&
      !this.inputValues.editFlowName.value
    ) {
      validity.push({
        key: 'editFlowName',
        errorString: 'You must select a Flow if Edit Type is Flow',
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

  get emptyColumns() {
    return !this.inputValues.columns.value;
  }

  get emptyMasterDetailColumns() {
    return !this.inputValues.masterDetailConfiguration.value;
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

  get canEdit() {
    return this.inputValues.canEdit.value === YES_NO.YES;
  }

  get editInline() {
    return this.inputValues.editType.value === INLINE_FLOW.INLINE;
  }

  get editFlow() {
    return this.inputValues.editType.value === INLINE_FLOW.FLOW;
  }

  get addInline() {
    return this.inputValues.addType.value === INLINE_FLOW.INLINE;
  }

  get addFlow() {
    return this.inputValues.addType.value === INLINE_FLOW.FLOW;
  }

  get canDelete() {
    return this.inputValues.canDelete.value === YES_NO.YES;
  }

  get canBulkDelete() {
    return this.inputValues.canBulkDelete.value === YES_NO.YES;
  }

  get canBulkEdit() {
    return this.inputValues.canBulkEdit.value === YES_NO.YES;
  }

  get isMasterDetail() {
    return this.inputValues.isMasterDetail.value === YES_NO.YES;
  }

  get canDeleteEditable() {
    return !this.canBulkDelete;
  }

  get canEditEditable() {
    return !this.canBulkEdit;
  }

  get addTypeEditable() {
    return this.inputValues.editType.value === INLINE_FLOW.INLINE;
  }

  get inlineSave() {
    return this.inputValues.inlineSave.value === YES_NO.YES;
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
  handleOnFocusDropdown(event) {
    const fieldName = event.target.fieldName;

    this.dropdowns[fieldName] = true;
  }

  handleOnBlurDropdown(event) {
    const fieldName = event.target.fieldName;

    this.dropdowns[fieldName] = false;
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
      if (inputValue.linked && inputValue.linked.length > 0) {
        inputValue.linked.forEach((linked) => {
          const linkedValue = this.inputValues[linked.field];

          // only if they are of the same type and the condition is met (or no condition)
          if (linkedValue.valueType === inputValue.valueType && ((linked.on && linked.on === value) || !linked.on)) {
            // dispatch the change
            const detailLinked = {
              name: linked.field,
              newValue: linked.value || value,
              newValueDataType: linkedValue.valueType,
            };

            this._doDispatchChange(detailLinked);
          }
        });
      }
    }
  }

  handleEnableDisableMasterDetail(event) {
    this.handleInputChange(event);

    this.handleSaveMasterDetailFields({ detail: { value: '' } });
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
      this.handleSaveMasterDetailFields({ detail: { value: '' } });

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

  handleOpenMasterDetailFields() {
    this.showConfigureMasterDetailFields = true;
  }

  handleCloseMasterDetailFields() {
    this.showConfigureMasterDetailFields = false;
  }

  handleOpenFlowInputVariables(event) {
    this.flowInputVariablesType = event.target.name;
    this.flowInputs = this.inputValues[event.target.name].value;
    this.showFlowInputVariables = true;
  }

  handleCloseFlowInputVariables() {
    this.flowInputVariablesType = null;
    this.flowInputs = null;
    this.showFlowInputVariables = false;
  }

  handleSaveFlowInputVariables(event) {
    if (event && event.detail) {
      const detail = {
        name: this.flowInputVariablesType,
        newValue: event.detail.value,
        newValueDataType: 'string',
      };

      this._doDispatchChange(detail);

      this.handleCloseFlowInputVariables();
    }
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

  handleSaveMasterDetailFields(event) {
    if (event && event.detail) {
      // dispatch the configuration
      let detail = {
        name: 'masterDetailConfiguration',
        newValue: event.detail.value,
        newValueDataType: 'string',
      };

      this._doDispatchChange(detail);

      if (event.detail.value) {
        // dispatch each field (2 for master details)
        const mdDetails = JSON.parse(event.detail.value);

        Object.keys(mdDetails).forEach((fld) => {
          detail = {
            name: fld,
            newValue: `{!${mdDetails[fld].defaultValue}}`,
            newValueDataType: 'string',
          };

          this._doDispatchChange(detail);
        });
      } else {
        this._doDispatchChange({
          name: 'masterDetailField1',
          newValue: null,
          newValueDataType: 'string',
        });
        this._doDispatchChange({
          name: 'masterDetailField2',
          newValue: null,
          newValueDataType: 'string',
        });
      }

      this.handleCloseMasterDetailFields();
    }
  }
}
