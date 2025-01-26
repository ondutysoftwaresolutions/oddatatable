import { LightningElement, api, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import Toast from 'lightning/toast';
import OD_DatatableResource from '@salesforce/resourceUrl/OD_Datatable';
import getConfiguration from '@salesforce/apex/OD_DatatableConfigurationController.getConfiguration';
import getFieldsForObject from '@salesforce/apex/OD_DatatableConfigurationController.getFieldsForObject';
import {
  ALIGNMENT_OPTIONS,
  AVAILABLE_FIELDS_GROUPING,
  FIELD_TYPES,
  YES_NO,
  EMPTY_STRING,
  INLINE_FLOW,
  GROUPING_SOURCE,
  SELECTION_TYPES,
  SORT_DIRECTION,
  SHARING_CONTEXT,
} from 'c/odDatatableConstants';
import { reduceErrors, generateRandomString, sortArrayByProperty } from 'c/odDatatableUtils';
import OdDatatablePreview from 'c/odDatatablePreview';

export default class OdConfigurationEditor extends LightningElement {
  @api genericTypeMappings;
  @api builderContext;

  @track objectTypes = [];
  @track flows = [];

  // constants
  fieldTypes = FIELD_TYPES;
  yesNo = YES_NO;
  inlineFlow = INLINE_FLOW;
  configurationJSON;
  sortDirectionOptions = Object.values(SORT_DIRECTION);

  // state
  isLoading = true;
  errorMessage = false;

  // dropdowns
  @track dropdowns = {
    objectName: false,
    tableData: false,
    addFlowName: false,
    editFlowName: false,
    platformEventMatchingFieldName: false,
    platformEventMatchingId: false,
    paginationAlignment: false,
    groupingField: false,
    groupSortField: false,
    groupSortDirection: false,
    groupContentSortField: false,
    groupContentSortDirection: false,
  };

  @track fields = [];
  @track fieldsForPlatformEvent = [];

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

  groupingSourceOptions = [
    {
      label: GROUPING_SOURCE.DATASET,
      value: GROUPING_SOURCE.DATASET,
    },
    {
      label: GROUPING_SOURCE.FIELD,
      value: GROUPING_SOURCE.FIELD,
    },
  ];

  selectionTypeOptions = [
    {
      label: SELECTION_TYPES.MULTIPLE,
      value: SELECTION_TYPES.MULTIPLE,
    },
    {
      label: SELECTION_TYPES.SINGLE,
      value: SELECTION_TYPES.SINGLE,
    },
  ];

  sharingContextOptions = [
    {
      label: SHARING_CONTEXT.WITHOUT_SHARING,
      value: SHARING_CONTEXT.WITHOUT_SHARING,
    },
    {
      label: SHARING_CONTEXT.WITH_SHARING,
      value: SHARING_CONTEXT.WITH_SHARING,
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
  _elementInfo;
  _automaticOutputVariables;

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
        "Screen flow name to fire whenever the add button is clicked. A 'recordOutput' SObject record Output variable is needed.",
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
        'Specify wether you want to be able to edit the data directly in the table (Inline) or with a Flow. If Edit is with a flow, then Add must be with a Flow.',
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
        "Screen flow name to fire whenever the edit button in the row is clicked.  A 'recordId' Input Variable and a 'recordOutput' SObject record Output variable are needed.",
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
        {
          field: 'canSelect',
          on: YES_NO.YES,
        },
        {
          field: 'selectionType',
          on: YES_NO.YES,
          value: SELECTION_TYPES.MULTIPLE,
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
        {
          field: 'canSelect',
          on: YES_NO.YES,
        },
        {
          field: 'selectionType',
          on: YES_NO.YES,
          value: SELECTION_TYPES.MULTIPLE,
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
    listenToPlatformEvent: {
      label: 'Listen to Platform Event?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled, the component will listened to the OD_Refresh_Datatable__e Platform Event and refreshes itself when there is matching Id.',
    },
    platformEventMatchingFieldName: {
      label: 'Refresh Matching Field',
      type: FIELD_TYPES.STRING,
      valueType: FIELD_TYPES.STRING,
      helpText:
        'The fieldName to use when matching and refreshing with Platform event. This fields must be in the data source collection.',
    },
    platformEventMatchingId: {
      label: 'Refresh Matching Id',
      type: FIELD_TYPES.STRING,
      valueType: FIELD_TYPES.STRING,
      helpText:
        'Variable, Constant, formula etc, that contains the matching id to use when refreshing with Platform event.',
    },
    pagination: {
      label: 'Pagination Enabled?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText: 'If enabled, the data will be paginated and a control for the pagination will be displayed.',
    },
    pageSize: {
      label: 'Page Size',
      type: FIELD_TYPES.INTEGER,
      valueType: FIELD_TYPES.STRING,
      value: 10,
      helpText: 'Number of records to display per page.',
    },
    paginationShowOptions: {
      label: 'Display Navigation Options?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText:
        'If enabled, the pagination options: First, Prev, Next and Last will be showed, otherwise just the page numbers.',
    },
    paginationAlignment: {
      label: 'Alignment',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: ALIGNMENT_OPTIONS.CENTER.value,
      helpText: 'Alignment for the pagination controls.',
    },
    grouping: {
      label: 'Grouping Enabled?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText: 'If enabled, the data will be grouped by the field specified.',
      linked: [
        {
          field: 'showRowNumberColumn',
          on: YES_NO.YES,
          value: YES_NO.NO,
        },
      ],
    },
    groupingField: {
      label: 'Group By',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText:
        'Field to group the data by. If the field is not present in the dataset then it will not group the data.',
    },
    groupSortField: {
      label: 'Sort Group By',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText:
        'Field to sort the group the data by. It can be the Grouping field or any of the summarized columns (if any). Default is the Grouping Field.',
    },
    groupSortDirection: {
      label: 'Group Sort Direction',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: SORT_DIRECTION.ASC.value,
      helpText:
        'Order the groups ASC (A-Z, 0-9, Oldest dates first) or DESC (Z-A, 9-0, Newest Dates first). Default is ASC.',
    },
    groupContentSortField: {
      label: 'Sort Content of Group By',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText: 'Field to sort the content of the group by. It can be one of the fields being showed in the table.',
    },
    groupContentSortDirection: {
      label: 'Group Content Sort Direction',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      value: SORT_DIRECTION.ASC.value,
      helpText:
        'Order the content of the group ASC (A-Z, 0-9, Oldest dates first) or DESC (Z-A, 9-0, Newest Dates first). Default is ASC.',
    },
    groupingSource: {
      label: 'Source',
      type: FIELD_TYPES.RADIO_BUTTON_TYPE,
      valueType: FIELD_TYPES.STRING,
      value: GROUPING_SOURCE.DATASET,
      helpText:
        'Specify wether you want the grouping to be based on data from the source data or grouping by the picklist options. If picklist, then you can select to show/hide the empty groups. If dataset, then it will only show the ones with data and the records without it as a last group.',
    },
    groupingSourceFieldData: {
      label: 'Source Field Data',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      helpText:
        'If the grouping source is the Picklist field data, this is a comma separated string of all the values to group by for.',
    },
    showEmptyGroups: {
      label: 'Show Empty?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText: 'If enabled, the groups with no data in it will be shown.',
    },
    showTotalsByGroup: {
      label: 'Show Totals By Group?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.YES,
      helpText: 'If enabled, a line with the totals by group will be shown.',
    },
    recalculateLive: {
      label: 'Recalculate totals on the fly?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled and Add or Edit is inline, the totals will be recalculated whenever the data changes in the table.',
    },
    canCollapseGroups: {
      label: 'Can Collapse/Expand Groups?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled you can click on the group row to collapse or expand. All calculations will include the collapsed rows, and if you change/add/delete a row, collapse it and save it will still save the changed rows.',
    },
    canSelect: {
      label: 'Selection Enabled?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled a checkbox or radio button will be displayed to allow the selection of the row. NOTE: if Bulk Edit, Bulk Delete or any other Bulk Operation button are selected, then the checkbox will display regardless of this being No.',
    },
    selectionType: {
      label: 'Type of Selection',
      type: FIELD_TYPES.RADIO_BUTTON_TYPE,
      valueType: FIELD_TYPES.STRING,
      value: SELECTION_TYPES.MULTIPLE,
      helpText:
        'Allow the selection of multiple rows (checkbox) or single row (radio button). NOTE:  if Bulk Edit, Bulk Delete or any other Bulk Operation button are selected, then checkboxes will display regardless of this being Single Row.',
    },
    showRowNumberColumn: {
      label: 'Show the column with the row number?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled an extra column at the beginning will be added to show the number of the row. This will only work if grouping is disabled and there are no summarized columns.',
    },
    canExport: {
      label: 'Export Enabled?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText: 'If enabled a button will display at the top right corner of the table to export the data to a CSV',
    },
    exportGroups: {
      label: 'Include the groups in the export?',
      type: FIELD_TYPES.TOGGLE,
      valueType: FIELD_TYPES.STRING,
      value: YES_NO.NO,
      helpText:
        'If enabled an extra column will be added to the CSV with the group name. Only works if the grouping is enabled.',
    },
    exportFileName: {
      label: 'Filename for the CSV',
      type: FIELD_TYPES.TEXT,
      valueType: FIELD_TYPES.STRING,
      canBeEmpty: true,
      helpText:
        'This is the filename that will be used when exporting (without the csv extension). If nothing specified the filename will be dataExport.csv',
    },
    sharingContext: {
      label: 'Sharing Context',
      type: FIELD_TYPES.RADIO_BUTTON_TYPE,
      valueType: FIELD_TYPES.STRING,
      value: SHARING_CONTEXT.WITHOUT_SHARING,
      helpText: 'The sharing context to executes the queries when using the component.',
    },

    // internal use
    uniqueTableName: {
      label: 'Unique Table Name',
      type: FIELD_TYPES.TEXT,
      value: generateRandomString(36, 2, 10),
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
      helpText: 'JSON string with the columns and values for the master detail relationships.',
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
    Promise.all([loadStyle(this, `${OD_DatatableResource}/css/main.css`)]);
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

      // if there is already a saved configuration
      if (this.inputType) {
        // get the fields for the object
        this._getFieldsForObject(this.inputType);
      }
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

  @api
  get elementInfo() {
    return this._elementInfo;
  }

  @api
  get automaticOutputVariables() {
    return this._automaticOutputVariables;
  }

  // =================================================================
  // setter for inputs
  // =================================================================
  // Set the fields with the data that was stored from the flow.
  set inputVariables(variables) {
    this._inputVariables = variables || [];
    this._initializeValues();
  }

  // Set a local variable with the data that was stored from flow.
  set elementInfo(info) {
    this._elementInfo = info || {};
  }

  set automaticOutputVariables(value) {
    this._automaticOutputVariables = value || {};
  }

  // =================================================================
  // getter methods
  // =================================================================
  get inputType() {
    const type = this.genericTypeMappings.find(({ typeName }) => typeName === 'T');
    return type && type.typeValue;
  }

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

  get canSelectEditable() {
    return (
      !this.canBulkDelete && !this.canBulkEdit && !this._areThereAnyBulkFlowButtons(this.inputValues.columns.value)
    );
  }

  get canSelectEnabled() {
    return this.inputValues.canSelect.value === YES_NO.YES;
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

  get listenToPlatformEvent() {
    return this.inputValues.listenToPlatformEvent.value === YES_NO.YES;
  }

  get paginationEnabled() {
    return this.inputValues.pagination.value === YES_NO.YES;
  }

  get groupingEnabled() {
    return this.inputValues.grouping.value === YES_NO.YES;
  }

  get emptyColumns() {
    return !this.inputValues.columns.value;
  }

  get columnsConfigured() {
    return !this.emptyColumns;
  }

  get emptyMasterDetailColumns() {
    return !this.inputValues.masterDetailConfiguration.value;
  }

  get paginationAlignmentOptions() {
    return Object.values(ALIGNMENT_OPTIONS);
  }

  get showRowNumberEditable() {
    return !this.groupingEnabled && this.summarizedColumns.length === 0;
  }

  get exportEnabled() {
    return this.inputValues.canExport.value === YES_NO.YES;
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

          // add collection processors here if any (for Filter elements e.g.)
          const collectionProcessors = this.builderContext.collectionProcessors.filter(
            (cp) => cp.collectionReference === lro.name,
          );
          if (collectionProcessors.length > 0) {
            collectionProcessors.forEach((cpo) => {
              result.push({
                label: cpo.label,
                value: cpo.name,
              });
            });
          }
        });
      }
    }

    // add here the output variables (this supports the data fetcher component e.g.)
    const automaticVariables = Object.keys(this.automaticOutputVariables).filter(
      (av) => av !== this.elementInfo.apiName,
    );
    if (automaticVariables.length > 0) {
      // traverse each key and check if there is an output value, collection for same object type
      automaticVariables.forEach((av) => {
        const screenComponent = this.automaticOutputVariables[av];

        const outputVariableForObject = screenComponent.filter(
          (sc) => sc.dataType === 'sobject' && sc.isOutput && sc.maxOccurs > 1 && sc.subtype === this.inputType,
        );

        if (outputVariableForObject.length > 0) {
          outputVariableForObject.forEach((ovo) => {
            result.push({
              label: `${av} => ${ovo.label || ovo.apiName}`,
              value: `${av}.${ovo.apiName}`,
            });
          });
        }
      });
    }

    return result;
  }

  get matchingIdOptions() {
    const result = [];

    // variables
    const variables = this.builderContext.variables;
    if (variables.length > 0) {
      const variablesPerType = variables.filter((vr) => vr.dataType.toLowerCase() === 'string');

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
      const formulasPerType = formulas.filter((fml) => fml.dataType.toLowerCase() === 'string');

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
      const constantsPerType = constants.filter((cnt) => cnt.dataType.toLowerCase() === 'string');

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

  get summarizedColumns() {
    const result = [];

    if (this.fields.length > 0) {
      // add the summarized columns here
      JSON.parse(this.inputValues.columns.value)
        .filter((col) => col.typeAttributes.config.summarize)
        .forEach((sumCol) => {
          result.push(this.fields.find((fld) => fld.value === sumCol.fieldName));
        });
    }

    return result;
  }

  get groupingFieldOptions() {
    // get all the fields that can be used from the object
    const result = this.fields.filter((fld) => AVAILABLE_FIELDS_GROUPING.includes(fld.type));

    // add the summarize columns if not there and any
    const sumColumns = this.summarizedColumns.filter(
      (col) => AVAILABLE_FIELDS_GROUPING.includes(col.type) && !result.find((fld) => fld.fieldName === col.value),
    );

    if (sumColumns.length > 0) {
      result.push(sumColumns);
    }

    return sortArrayByProperty(result, 'label');
  }

  get groupingSortFieldOptions() {
    // add the summarized columns here
    const result = this.summarizedColumns;

    if (!result.find((col) => col.value === this.inputValues.groupingField.value)) {
      result.push(this.fields.find((fld) => fld.value === this.inputValues.groupingField.value));
    }

    return sortArrayByProperty(result, 'label');
  }

  get groupContentSortFieldOptions() {
    const result = [];

    if (this.fields.length > 0) {
      JSON.parse(this.inputValues.columns.value)
        .filter((col) => !col.typeAttributes.config.isCustom)
        .forEach((col) => {
          result.push(this.fields.find((fld) => fld.value === col.fieldName));
        });
    }

    return result;
  }

  get groupingFieldConfiguration() {
    return this.fields.length > 0 && this.fields.find((fld) => fld.value === this.inputValues.groupingField.value);
  }

  get isGroupingFieldPicklist() {
    return this.groupingFieldConfiguration.type === FIELD_TYPES.SELECT;
  }

  get isGroupingSourceDataset() {
    return this.inputValues.groupingSource.value === GROUPING_SOURCE.FIELD;
  }

  // =================================================================
  // private methods
  // =================================================================
  _getFieldsForObject(objectName) {
    getFieldsForObject({ objectName: objectName })
      .then((res) => {
        this.isLoading = false;
        this.fields = res;
        this.errorMessage = null;

        this.fieldsForPlatformEvent = JSON.parse(JSON.stringify(this.fields)).map((fl) => {
          return { label: fl.value, value: fl.value };
        });
      })
      .catch((error) => {
        this.isLoading = false;
        this.errorMessage = reduceErrors(error);
      });
  }

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

  _areThereAnyBulkFlowButtons(columns) {
    return (
      JSON.parse(columns).filter(
        (cl) => cl.typeAttributes.config && cl.typeAttributes.config.showAs && cl.typeAttributes.config.showAsMultiple,
      ).length > 0
    );
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

      // if it's grouping source and the value is field, send the source field data too
      if (event.detail.fieldName === 'groupingSource' && value === GROUPING_SOURCE.FIELD) {
        const detail = {
          name: 'groupingSourceFieldData',
          newValue: this.groupingFieldConfiguration.options.map((opt) => opt.value).join(','),
          newValueDataType: this.inputValues.groupingSourceFieldData.valueType,
        };

        this._doDispatchChange(detail);
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

      // get the fields for the object
      this._getFieldsForObject(newValue);
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
      let detail = {
        name: 'columns',
        newValue: event.detail.value,
        newValueDataType: 'string',
      };

      this._doDispatchChange(detail);

      if (event.detail.value) {
        // if there is any bulk navigation button, trigger the change to can select and select multiple
        if (this._areThereAnyBulkFlowButtons(event.detail.value)) {
          detail = {
            name: 'canSelect',
            newValue: YES_NO.YES,
            newValueDataType: 'string',
          };

          this._doDispatchChange(detail);

          detail = {
            name: 'selectionType',
            newValue: SELECTION_TYPES.MULTIPLE,
            newValueDataType: 'string',
          };

          this._doDispatchChange(detail);
        }

        // if there is at least one summarized column, trigger the change for show row numbers to false
        if (JSON.parse(event.detail.value).filter((col) => col.typeAttributes.config.summarize).length > 0) {
          detail = {
            name: 'showRowNumberColumn',
            newValue: YES_NO.NO,
            newValueDataType: 'string',
          };

          this._doDispatchChange(detail);
        }
      }

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

  async handleShowPreview() {
    // open the modal
    await OdDatatablePreview.open({
      label: 'Preview',
      size: 'medium',
      configuration: this.inputValues,
    });
  }

  // configuration copy and paste
  handleConfigurationChange(evt) {
    this.configurationJSON = evt.detail.value;
  }

  handleCopyConfigurationToClipboard() {
    const { tableData, ...other } = this.inputValues;

    const valueToCopy = JSON.stringify(other);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(valueToCopy);
    } else {
      const input = document.createElement('textarea');
      input.innerHTML = valueToCopy;
      document.body.appendChild(input);
      input.select();

      // deprecated but still a good fallback because it is supported in most of the browsers
      document.execCommand('copy');

      document.body.removeChild(input);
    }

    // display a success toast
    Toast.show(
      {
        label: 'Copied!',
        message: 'The configuration was copied to your clipboard',
        mode: 'dismissible',
        variant: 'success',
      },
      this,
    );
  }

  handleProcessConfigurationToClipboard() {
    if (!this.configurationJSON) {
      Toast.show(
        {
          label: 'Field Required!',
          message: 'Please paste the JSON in the above field to be able to process it',
          mode: 'dismissible',
          variant: 'error',
        },
        this,
      );
    } else {
      const configuration = JSON.parse(this.configurationJSON);

      this.inputValues = {
        ...configuration,
        tableData: this.inputValues.tableData,
      };

      // dispatch the changes
      Object.keys(this.inputValues).forEach((key) => {
        const element = this.inputValues[key];

        // dispatch the change
        const detail = {
          name: key,
          newValue: element.value ? element.value : null,
          newValueDataType: element.valueType,
        };

        this._doDispatchChange(detail);
      });

      this.configurationJSON = '';

      // display a success toast
      Toast.show(
        {
          label: 'Processed!',
          message: 'The configuration was process successfully',
          mode: 'dismissible',
          variant: 'success',
        },
        this,
      );
    }
  }
}
