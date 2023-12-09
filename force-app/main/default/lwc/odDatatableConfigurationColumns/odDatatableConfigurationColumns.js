import { LightningElement, api, wire, track } from 'lwc';
import getFieldsForObject from '@salesforce/apex/OD_ConfigurationEditorController.getFieldsForObject';
import {
  reduceErrors,
  getPopupHeight,
  getBodyPopupClasses,
  sortArrayByProperty,
  getFieldType,
  getPrecision,
  generateRandomNumber,
} from 'c/odDatatableUtils';
import {
  FIELD_TYPES,
  DATE_FIELDS,
  NUMERIC_FIELDS,
  FORMATTED_TYPE_TO_SHOW,
  BUTTON_TYPES,
  ROW_BUTTON_TYPE,
  ROW_BUTTON_CONFIGURATION,
} from 'c/odDatatableConstants';

export default class OdConfigurationColumns extends LightningElement {
  @api objectName;
  @api columns;
  @api builderContext;
  @api flows;

  @track fieldsToDisplayTable = [];
  @track fields = [];

  @track selectedFields = [];
  popupHeight;
  isSelectFieldsOpened = false;
  isLoading = true;
  loadingMessage = 'Getting the columns. Please wait...';
  errorMessage = false;
  fieldTypes = FIELD_TYPES;

  // lookup configuration
  showLookupConfiguration = false;
  lookupConfiguration;
  lookupObjectName;
  lookupFieldName;

  // flow input varianles
  showFlowInputVariables = false;
  flowInputs;
  flowFieldName;

  // private variables
  _alreadyRendered = false;
  _allFields;

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
      this._allFields = JSON.parse(JSON.stringify(data));

      this._selectFields();

      this._buildFieldsAvailable();
    } else if (error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(error);
    }
  }

  // =================================================================
  // getters methods
  // =================================================================
  get theType() {
    return FIELD_TYPES.SELECT;
  }

  get disabledSave() {
    return this.selectedFields.length === 0;
  }

  get bodyClasses() {
    return `slds-p-around--large ${getBodyPopupClasses(this)}`;
  }

  // =================================================================
  // private methods
  // =================================================================
  _isMulti(type) {
    return type === FIELD_TYPES.MULTISELECT;
  }

  _buildFieldsAvailable() {
    const result = JSON.parse(JSON.stringify(this._allFields));

    result.forEach((rs) => {
      if (
        DATE_FIELDS.includes(rs.type) ||
        NUMERIC_FIELDS.includes(rs.type) ||
        rs.type === FIELD_TYPES.CURRENCY ||
        rs.type === FIELD_TYPES.PERCENTAGE
      ) {
        rs.initialWidth = 120;
      }

      // add the the is multiple for multi picklist
      rs.isMulti = this._isMulti(rs.type);
    });

    this.fields = result.filter((fld) => !fld.isMasterDetail);
  }

  _buildTypeSpec(type, field) {
    let theType = type;

    // first arrange the text area, long text area and rich text area
    if (FIELD_TYPES.TEXTAREA === type) {
      if (field.isHTML) {
        theType = FIELD_TYPES.RICH_TEXTAREA;
      } else {
        if (field.maxLength > 255) {
          theType = FIELD_TYPES.LONG_TEXTAREA;
        }
      }
    }

    let formattedType = FORMATTED_TYPE_TO_SHOW[theType];
    let result = formattedType.label;

    // with maxLength
    if (formattedType.maxLength && field.maxLength) {
      result += `(${field.maxLength})`;
    }

    // numbers with precision
    if (formattedType.precision && field.precision) {
      const scale = field.scale || 0;
      result += `(${field.precision - scale}, ${scale})`;
    }

    // numbers with digits
    if (formattedType.digits && field.digits) {
      result += `(${field.digits})`;
    }

    // lookup
    if (formattedType.object && field.parentObjectName) {
      result += `(${field.parentObjectLabel})`;
    }

    // options
    if (formattedType.options?.length > 0) {
      result = formattedType.options;
    }

    return result;
  }

  _buildOptionsFromFlow(type) {
    const result = [];

    // variables
    const variables = this.builderContext.variables;
    if (variables.length > 0) {
      const variablesPerType = variables.filter((vr) => vr.dataType.toLowerCase() === type);

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
      const formulasPerType = formulas.filter((fml) => fml.dataType.toLowerCase() === type);

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
      const constantsPerType = constants.filter((cnt) => cnt.dataType.toLowerCase() === type);

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

  _selectFields() {
    const parsedColumns = this.columns ? JSON.parse(this.columns) : [];
    const result = [];

    parsedColumns.forEach((col) => {
      // get the field from the fields api
      const fieldIndex = col.typeAttributes.config.isCustom
        ? 0
        : this._allFields.findIndex((fl) => fl.value === col.fieldName);

      if (fieldIndex !== -1) {
        // get the field
        const field = col.typeAttributes.config.isCustom
          ? { type: FIELD_TYPES.CUSTOM, value: col.fieldName }
          : this._allFields[fieldIndex];

        const type = getFieldType(field.type);
        const typeSpec = this._buildTypeSpec(type, field);

        const selectedCustom = Array.isArray(typeSpec)
          ? typeSpec.find((ts) => ts.value === col.typeAttributes.config.customType)
          : {};

        result.push({
          ...selectedCustom,
          ...field,
          label: col.typeAttributes.config.isCustom ? `Custom: ${col.tableLabel}` : col.tableLabel || field.label,
          type: type,
          tableLabel: col.tableLabel,
          typeSpec: typeSpec,
          precision: getPrecision(field),
          isMulti: this._isMulti(type),
          isEditable: col.typeAttributes.editable,
          required: col.typeAttributes.required,
          defaultValue: col.typeAttributes.config.defaultValue,
          initialWidth: col.initialWidth,
          hidden: col.typeAttributes.config.hidden,
          isLookup: type === FIELD_TYPES.LOOKUP,
          typeForDefault: type === FIELD_TYPES.LOOKUP ? FIELD_TYPES.SELECT : type,
          options: type === FIELD_TYPES.LOOKUP ? this._buildOptionsFromFlow(FIELD_TYPES.STRING) : field.options,
          order: col.order,
          lookupConfig: col.typeAttributes.config.lookupConfig,
          isCustom: col.typeAttributes.config.isCustom,
          isFieldColumn: !col.typeAttributes.config.isCustom,
          customType: col.typeAttributes.config.customType,
          flowName: col.typeAttributes.config.flowName,
          flowInputVariables: col.typeAttributes.config.flowInputVariables,
        });
      }
    });

    this.selectedFields = result;
    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  _addDataAndOrderFields(fields) {
    let result = sortArrayByProperty(fields, 'order');
    const elementsWithOrder = result.filter((fl) => fl.order);
    let lastElement;

    if (elementsWithOrder.length > 0) {
      lastElement = elementsWithOrder[elementsWithOrder.length - 1];
    } else {
      lastElement = { order: 0 };
    }

    let iteration = 1;
    result = result.map((fl) => {
      if (!fl.order) {
        const typeSpec = this._buildTypeSpec(fl.type, fl);

        let newField = {};

        newField.order = lastElement.order + 10 * iteration;
        newField.isCustom = fl.type === FIELD_TYPES.CUSTOM;
        newField.isFieldColumn = !newField.isCustom;
        newField.tableLabel = fl.label;
        newField.typeSpec = typeSpec;
        newField.precision = getPrecision(fl);
        newField.isMulti = this._isMulti(fl.type);
        newField.type = getFieldType(fl.type);
        newField.isLookup = fl.type === FIELD_TYPES.LOOKUP;
        newField.typeForDefault = newField.isLookup ? FIELD_TYPES.SELECT : fl.type;
        newField.options = newField.isLookup ? this._buildOptionsFromFlow(FIELD_TYPES.STRING) : fl.options;

        // if typespec is an array
        if (Array.isArray(typeSpec)) {
          // eslint-disable-next-line no-unused-vars
          const { value, label, ...other } = typeSpec[0];
          newField.customType = value;

          newField = {
            ...newField,
            ...other,
          };
        }
        iteration++;

        return { ...fl, ...newField };
      }
      return fl;
    });

    return result;
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

  handleColumnsOnFocusDropdown(e) {
    const value = e.target.dataset.value;
    const fieldName = e.detail.fieldName;

    this.fieldsToDisplayTable.forEach((fl) => {
      if (fl.value === value) {
        fl[`opened_${fieldName}`] = true;
      } else {
        fl[`opened_${fieldName}`] = false;
      }
    });
  }

  handleColumnsOnBlurDropdown(e) {
    const fieldName = e.detail.fieldName;
    this.fieldsToDisplayTable.forEach((fl) => {
      fl[`opened_${fieldName}`] = false;
    });
  }

  handleSelectField(event) {
    this.selectedFields = this._addDataAndOrderFields(event.detail.value);

    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  handleUpdateField(event) {
    const { fieldName, value, ...other } = event.detail;
    const fieldAPIName = event.target.dataset.value;
    const isCustom = event.target.dataset.custom === 'true';

    let objectToUpdate = {
      [fieldName]: value,
    };

    if (event.target.dataset.field) {
      objectToUpdate[event.target.dataset.field] = value;
    }

    // update the right field in the arrays
    // selected fields array
    const fieldIndexSelected = this.selectedFields.findIndex((fl) => fl.value === fieldAPIName);

    // if custom search to determine the options
    if (isCustom && this.selectedFields[fieldIndexSelected].typeSpec.length > 0) {
      const {
        // eslint-disable-next-line no-unused-vars
        label,
        // eslint-disable-next-line no-unused-vars
        value: theValue,
        // eslint-disable-next-line no-shadow
        ...other
      } = this.selectedFields[fieldIndexSelected].typeSpec.find((ts) => ts.value === value);
      objectToUpdate = {
        ...objectToUpdate,
        ...other,
      };
    }

    this.selectedFields[fieldIndexSelected] = {
      ...this.selectedFields[fieldIndexSelected],
      ...objectToUpdate,
      ...other,
    };

    // fields to display table array
    const fieldIndex = this.fieldsToDisplayTable.findIndex((fl) => fl.value === fieldAPIName);
    this.fieldsToDisplayTable[fieldIndex] = { ...this.fieldsToDisplayTable[fieldIndex], ...objectToUpdate, ...other };
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    this.handleReorder();

    const result = [];

    // common properties
    this.fieldsToDisplayTable.forEach((field) => {
      let fieldToAdd = {
        label: `${field.required ? '* ' : ''}${field.tableLabel}`,
        tableLabel: field.tableLabel,
        order: field.order,
        fieldName: field.value,
        wrapText: true,
        hideDefaultActions: true,
        typeAttributes: {
          type: field.type,
          recordId: { fieldName: '_id' },
          record: { fieldName: '_originalRecord' },
          fieldName: field.value,
          isNew: { fieldName: 'isNew' },
          isDeleted: { fieldName: 'isDeleted' },
          value: {
            fieldName: field.value,
          },
        },
      };

      // for object field columns
      if (field.isFieldColumn) {
        fieldToAdd = {
          ...fieldToAdd,
          type: 'inputGeneric',
          typeAttributes: {
            ...fieldToAdd.typeAttributes,
            editable: field.isEditable,
            required: field.required,
            config: {
              ...fieldToAdd.typeAttributes.config,
              maxLength: field.maxLength,
              defaultValue: field.defaultValue,
              parentObjectName: field.parentObjectName,
              options: field.isLookup ? [] : field.options,
              scale: field.scale,
              precision: field.precision,
              isHTML: field.isHTML,
              isMulti: field.isMulti,
              lookupConfig: field.lookupConfig,
              hidden: field.hidden,
            },
          },
        };
      } else {
        // custom columns
        fieldToAdd = {
          ...fieldToAdd,
          typeAttributes: {
            ...fieldToAdd.typeAttributes,
            disableIfDeleted: true,
            label: field.tableLabel,
            config: {
              ...fieldToAdd.typeAttributes.config,
              isCustom: field.isCustom,
              customType: field.customType,
            },
          },
        };

        // for button types specifically
        if (BUTTON_TYPES.includes(field.customType)) {
          fieldToAdd = {
            ...fieldToAdd,
            cellAttributes: { alignment: 'center' },
            type: ROW_BUTTON_TYPE,
            typeAttributes: {
              ...fieldToAdd.typeAttributes,
              name: ROW_BUTTON_CONFIGURATION.OPEN_FLOW.action,
              config: {
                ...fieldToAdd.typeAttributes.config,
                flowName: field.flowName,
                flowInputVariables: field.flowInputVariables,
              },
            },
          };
        }
      }

      // add the initial width
      if (field.initialWidth) {
        fieldToAdd.initialWidth = field.initialWidth;
      }

      result.push(fieldToAdd);
    });

    // dispatch the save
    const event = new CustomEvent('save', { detail: { value: JSON.stringify(result) } });

    this.dispatchEvent(event);
  }

  handleReorder() {
    this.selectedFields = sortArrayByProperty(this.fieldsToDisplayTable, 'order');
    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  handleOpenLookupConfiguration(event) {
    this.lookupObjectName = event.target.dataset.object;
    this.lookupFieldName = event.target.dataset.field;
    this.lookupConfiguration = event.target.dataset.configuration;
    this.showLookupConfiguration = true;
  }

  handleCloseLookupConfiguration() {
    this.showLookupConfiguration = false;
    this.lookupObjectName = undefined;
    this.lookupFieldName = undefined;
  }

  handleSaveLookupConfiguration(event) {
    this.handleUpdateField(event);

    this.handleCloseLookupConfiguration();
  }

  handleAddNonObjectColumn() {
    const fieldsPlusCustom = JSON.parse(JSON.stringify(this.selectedFields));

    fieldsPlusCustom.push({
      label: 'Custom Column',
      type: FIELD_TYPES.CUSTOM,
      value: generateRandomNumber(36, 2, 10),
      isEditable: false,
      required: false,
      canEdit: false,
      hidden: false,
      defaultValue: null,
      initialWidth: 80,
    });

    this.handleSelectField({ detail: { value: fieldsPlusCustom } });
  }

  handleOpenFlowInputVariables(event) {
    this.flowFieldName = event.target.dataset.value;
    const configuration = this.selectedFields.find((fl) => fl.value === this.flowFieldName);
    this.flowInputs = configuration.flowInputVariables || null;
    this.showFlowInputVariables = true;
  }

  handleCloseFlowInputVariables() {
    this.flowInputs = null;
    this.flowFieldName = null;
    this.showFlowInputVariables = false;
  }

  handleSaveFlowInputVariables(event) {
    if (event && event.detail) {
      this.handleUpdateField({
        target: {
          dataset: {
            value: this.flowFieldName,
          },
        },
        detail: {
          fieldName: 'flowInputVariables',
          value: event.detail.value,
        },
      });

      this.handleCloseFlowInputVariables();
    }
  }
}
