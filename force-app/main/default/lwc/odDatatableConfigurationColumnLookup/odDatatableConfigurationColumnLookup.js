import { LightningElement, wire, api, track } from 'lwc';
import getFieldsForObject from '@salesforce/apex/OD_DatatableConfigEditorController.getFieldsForObject';
import { FIELD_TYPES, DATE_FIELDS, FIELDS_STRING, SERVER_SIDE_SEARCH, SORT_DIRECTION } from 'c/odDatatableConstants';
import { reduceErrors, getPopupHeight, getBodyPopupClasses } from 'c/odDatatableUtils';

// search groups
const searchGroupOptions = [
  {
    label: 'All Fields',
    value: 'ALL FIELDS',
  },
  {
    label: 'Email Fields',
    value: 'EMAIL FIELDS',
  },
  {
    label: 'Name Fields',
    value: 'NAME FIELDS',
  },
  {
    label: 'Phone Fields',
    value: 'PHONE FIELDS',
  },
];

// standard operations for all the fields
const standardOperations = [
  {
    label: 'equals',
    value: ' = ',
  },
  {
    label: 'not equals',
    value: ' != ',
  },
  {
    label: 'not in',
    value: ' NOT IN ({value})',
  },
  {
    label: 'in',
    value: ' IN ({value})',
  },
];

// extra operations per type
const availableOperationsPerType = [
  {
    label: 'less than',
    value: ' < ',
    types: [
      FIELD_TYPES.DATE,
      FIELD_TYPES.DATETIME,
      FIELD_TYPES.DOUBLE,
      FIELD_TYPES.INTEGER,
      FIELD_TYPES.LONG,
      FIELD_TYPES.PERCENTAGE,
    ],
  },
  {
    label: 'greater than',
    value: ' > ',
    types: [
      FIELD_TYPES.DATE,
      FIELD_TYPES.DATETIME,
      FIELD_TYPES.DOUBLE,
      FIELD_TYPES.INTEGER,
      FIELD_TYPES.LONG,
      FIELD_TYPES.PERCENTAGE,
    ],
  },
  {
    label: 'less than or equals',
    value: ' <= ',
    types: [
      FIELD_TYPES.DATE,
      FIELD_TYPES.DATETIME,
      FIELD_TYPES.DOUBLE,
      FIELD_TYPES.INTEGER,
      FIELD_TYPES.LONG,
      FIELD_TYPES.PERCENTAGE,
    ],
  },
  {
    label: 'greater than or equals',
    value: ' >= ',
    types: [
      FIELD_TYPES.DATE,
      FIELD_TYPES.DATETIME,
      FIELD_TYPES.DOUBLE,
      FIELD_TYPES.INTEGER,
      FIELD_TYPES.LONG,
      FIELD_TYPES.PERCENTAGE,
    ],
  },
  {
    label: 'starts with',
    value: ` LIKE '{value}%'`,
    types: [
      FIELD_TYPES.ADDRESS,
      FIELD_TYPES.EMAIL,
      FIELD_TYPES.PHONE,
      FIELD_TYPES.SELECT,
      FIELD_TYPES.STRING,
      FIELD_TYPES.TEXT,
      FIELD_TYPES.TEXTAREA,
      FIELD_TYPES.URL,
    ],
  },
  {
    label: 'ends with',
    value: ` LIKE '%{value}'`,
    types: [
      FIELD_TYPES.ADDRESS,
      FIELD_TYPES.EMAIL,
      FIELD_TYPES.PHONE,
      FIELD_TYPES.SELECT,
      FIELD_TYPES.STRING,
      FIELD_TYPES.TEXT,
      FIELD_TYPES.TEXTAREA,
      FIELD_TYPES.URL,
    ],
  },
  {
    label: 'contains',
    value: ` LIKE '%{value}%'`,
    types: [
      FIELD_TYPES.ADDRESS,
      FIELD_TYPES.EMAIL,
      FIELD_TYPES.PHONE,
      FIELD_TYPES.SELECT,
      FIELD_TYPES.STRING,
      FIELD_TYPES.TEXT,
      FIELD_TYPES.TEXTAREA,
      FIELD_TYPES.URL,
    ],
  },
];

const booleanOptions = [
  {
    label: 'true',
    value: 'TRUE',
  },
  {
    label: 'false',
    value: 'FALSE',
  },
];

const notSelected = '-999';

export default class OdDatatableConfigurationColumnLookup extends LightningElement {
  @api objectName;
  @api configuration;

  isLoading = true;
  loadingMessage = 'Getting the fields. Please wait...';

  // configuration
  @track fields = [];

  @track dropdowns = {
    displayField: false,
    fieldWhere: false,
    operatorWhere: false,
    valueWhere: false,
    addOrder: false,
    directionOrder: false,
  };

  // search group
  selectedSearchGroup;

  // display field
  displayField;

  // query configuration
  // filter
  @track operations = standardOperations;

  selectedField = { type: FIELD_TYPES.TEXT };
  @track addWhere = {
    fieldWhere: '',
    operatorWhere: standardOperations[0].value,
    valueWhere: '',
  };
  finalWhereCondition;

  // order
  directions = Object.values(SORT_DIRECTION);
  @track addOrder = {
    fieldOrder: '',
    directionOrder: SORT_DIRECTION.ASC.value,
  };
  finalOrderCondition;

  // limit
  limit;

  // constants
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
  @wire(getFieldsForObject, { objectName: '$objectName' })
  _getFields({ error, data }) {
    if (data) {
      this.isLoading = false;
      this.fields = JSON.parse(JSON.stringify(data));

      this._buildStructure();
    } else if (error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(error);
    }
  }

  // =================================================================
  // getters methods
  // =================================================================
  get _parsedConfiguration() {
    return this.configuration ? JSON.parse(this.configuration) : {};
  }

  get bodyClasses() {
    return `slds-p-around--large ${getBodyPopupClasses(this)}`;
  }

  get searchGroups() {
    return searchGroupOptions;
  }

  get fieldsForDisplay() {
    let result = [
      {
        label: '--- Use Default ---',
        value: notSelected,
      },
    ];

    result = result.concat(this.fields);

    return result;
  }

  get fieldsForWhere() {
    const parsedFields = JSON.parse(JSON.stringify(this.fields));
    return parsedFields.filter((fld) => fld.canBeUsedInWhere);
  }

  get disabledAddFilter() {
    return !this.addWhere.fieldWhere || !this.addWhere.operatorWhere || !this.addWhere.valueWhere;
  }

  get disabledAddOrder() {
    return !this.addOrder.fieldOrder || !this.addOrder.directionOrder;
  }

  // =================================================================
  // private methods
  // =================================================================
  _buildStructure() {
    this.selectedSearchGroup = this._parsedConfiguration.searchGroup || searchGroupOptions[0].value;
    this.displayField = this._parsedConfiguration.displayField || notSelected;
    this.finalWhereCondition = this._parsedConfiguration.whereCondition;
    this.finalOrderCondition = this._parsedConfiguration.orderCondition;
    this.limit = this._parsedConfiguration.limit;
  }

  _buildAvailableOperationsForField(fieldName) {
    this.selectedField = this.fieldsForWhere.find((fld) => fld.value === fieldName);

    if (this.selectedField.type === FIELD_TYPES.MULTISELECT) {
      this.selectedField.isMulti = true;
    } else if (DATE_FIELDS.includes(this.selectedField.type) || SERVER_SIDE_SEARCH.includes(this.selectedField.type)) {
      this.selectedField.type = FIELD_TYPES.TEXT;
    } else if (this.selectedField.type === FIELD_TYPES.CHECKBOX) {
      this.selectedField.type = FIELD_TYPES.SELECT;
      this.selectedField.options = booleanOptions;
    }

    const result = [...standardOperations];

    // build the operations
    availableOperationsPerType.forEach((aop) => {
      if (aop.types.includes(this.selectedField.type)) {
        result.push(aop);
      }
    });

    this.operations = result;
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleOnFocusDropdown(event) {
    const fieldName = event.target.dataset.name;

    this.dropdowns[fieldName] = true;
  }

  handleOnBlurDropdown(event) {
    const fieldName = event.target.dataset.name;

    this.dropdowns[fieldName] = false;
  }

  handleDisplayFieldChange(event) {
    this.displayField = event.detail.value;
  }

  handleSearchGroupChange(event) {
    this.selectedSearchGroup = event.detail.value;
  }

  handleLimitChange(event) {
    this.limit = event.detail.value;
  }

  handleAddWhereInputChange(event) {
    const fieldName = event.target.dataset.name;
    const value = event.detail.value;

    this.addWhere[fieldName] = value;

    // build the operations
    if (fieldName === 'fieldWhere') {
      this._buildAvailableOperationsForField(value);
    }
  }

  handleAddOrderInputChange(event) {
    const fieldName = event.target.dataset.name;
    const value = event.detail.value;

    this.addOrder[fieldName] = value;
  }

  handleAddFilter() {
    // build the clause
    let clause = !this.finalWhereCondition ? '' : `${this.finalWhereCondition} AND `;

    // build value
    let value = this.addWhere.valueWhere;

    if (this.selectedField.type === FIELD_TYPES.MULTISELECT) {
      let valueByComma = '';
      value.forEach((vl) => {
        valueByComma += `${vl.value},`;
      });

      value = valueByComma.slice(0, -1);
    }

    // text fields
    if (FIELDS_STRING.includes(this.selectedField.type)) {
      const valuesReady = [];
      value.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).forEach((vl) => {
        valuesReady.push(`'${vl.replaceAll('"', '')}'`);
      });

      value = valuesReady.join(',');
    }

    // add field
    clause += this.addWhere.fieldWhere;

    // add operator and value
    // replace operator with value if needed
    if (this.addWhere.operatorWhere.includes('{value}')) {
      clause += this.addWhere.operatorWhere.replace('{value}', value);
    } else {
      clause += `${this.addWhere.operatorWhere}${value}`;
    }

    this.finalWhereCondition = clause;

    this.addWhere = {
      fieldWhere: '',
      operatorWhere: standardOperations[0].value,
      valueWhere: '',
    };
  }

  handleWhereConditionChange(event) {
    this.finalWhereCondition = event.detail.value;
  }

  handleAddOrder() {
    // build the clause
    let clause = !this.finalOrderCondition ? '' : `${this.finalOrderCondition}, `;

    clause += `${this.addOrder.fieldOrder} ${this.addOrder.directionOrder}`;

    this.finalOrderCondition = clause;

    this.addOrder = {
      fieldOrder: '',
      directionOrder: SORT_DIRECTION.ASC.value,
    };
  }

  handleOrderConditionChange(event) {
    this.finalOrderCondition = event.detail.value;
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    // build the object to save
    const objectToSave = {};

    // search group
    if (this.selectedSearchGroup) {
      objectToSave.searchGroup = this.selectedSearchGroup;
    }

    // display field
    if (this.displayField && this.displayField !== notSelected) {
      objectToSave.displayField = this.displayField;
    }

    // where condition
    if (this.finalWhereCondition) {
      objectToSave.whereCondition = this.finalWhereCondition;
    }

    // order condition
    if (this.finalOrderCondition) {
      objectToSave.orderCondition = this.finalOrderCondition;
    }

    // limit
    if (this.limit) {
      objectToSave.limit = this.limit;
    }

    const event = new CustomEvent('save', {
      detail: { fieldName: 'lookupConfig', value: JSON.stringify(objectToSave) },
    });
    this.dispatchEvent(event);
  }
}
