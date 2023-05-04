import { LightningElement, api, wire, track } from 'lwc';
import getFieldsForObject from '@salesforce/apex/OD_ConfigurationEditorController.getFieldsForObject';
import {
  reduceErrors,
  getPopupHeight,
  getBodyPopupClasses,
  sortArrayByProperty,
  getFieldType,
  getPrecision,
} from 'c/odDatatableUtils';
import { FIELD_TYPES, DATE_FIELDS, NUMERIC_FIELDS, FORMATTED_TYPE_TO_SHOW } from 'c/odDatatableConstants';

export default class OdConfigurationColumns extends LightningElement {
  @api objectName;
  @api columns;

  @track fieldsToDisplayTable = [];
  @track fields = [];

  selectedFields = [];
  popupHeight;
  isSelectFieldsOpened = false;
  isLoading = true;
  loadingMessage = 'Getting the columns. Please wait...';
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

    this.fields = result;
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

    return result;
  }

  _selectFields() {
    const parsedColumns = this.columns ? JSON.parse(this.columns) : [];
    const result = [];

    parsedColumns.forEach((col) => {
      // get the field from the fields api
      const fieldIndex = this._allFields.findIndex((fl) => fl.value === col.fieldName);

      // get the field
      const field = this._allFields[fieldIndex];

      const type = getFieldType(field.type);

      if (fieldIndex !== -1) {
        result.push({
          ...field,
          type: type,
          tableLabel: col.tableLabel,
          typeSpec: this._buildTypeSpec(type, field),
          precision: getPrecision(field),
          isMulti: this._isMulti(type),
          isEditable: col.typeAttributes.editable,
          required: col.typeAttributes.required,
          defaultValue: col.typeAttributes.config.defaultValue,
          initialWidth: col.initialWidth,
          order: col.order,
        });
      }
    });

    this.selectedFields = result;
    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  _addDataAndOrderFields(fields) {
    const result = sortArrayByProperty(fields, 'order');
    const elementsWithOrder = result.filter((fl) => fl.order);
    let lastElement;

    if (elementsWithOrder.length > 0) {
      lastElement = elementsWithOrder[elementsWithOrder.length - 1];
    } else {
      lastElement = { order: 0 };
    }

    let iteration = 1;
    result
      .filter((fl) => !fl.order)
      .forEach((fl) => {
        fl.order = lastElement.order + 10 * iteration;
        fl.tableLabel = fl.label;
        fl.typeSpec = this._buildTypeSpec(fl.type, fl);
        fl.precision = getPrecision(fl);
        fl.isMulti = this._isMulti(fl.type);
        fl.type = getFieldType(fl.type);
        iteration++;
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

  handleDefaultOnFocusDropdown(e) {
    const value = e.target.dataset.value;

    this.fieldsToDisplayTable.forEach((fl) => {
      if (fl.value === value) {
        fl.opened = true;
      } else {
        fl.opened = false;
      }
    });
  }

  handleDefaultOnBlurDropdown() {
    this.fieldsToDisplayTable.forEach((fl) => {
      fl.opened = false;
    });
  }

  handleSelectField(event) {
    this.selectedFields = this._addDataAndOrderFields(event.detail.value);

    this.fieldsToDisplayTable = JSON.parse(JSON.stringify(this.selectedFields));
  }

  handleUpdateField(event) {
    const { fieldName, value, ...other } = event.detail;
    const fieldAPIName = event.target.dataset.value;

    // update the right field in the array
    const fieldIndex = this.fieldsToDisplayTable.findIndex((fl) => fl.value === fieldAPIName);
    this.fieldsToDisplayTable[fieldIndex] = { ...this.fieldsToDisplayTable[fieldIndex], [fieldName]: value, ...other };
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    this.handleReorder();

    const result = [];

    this.fieldsToDisplayTable.forEach((field) => {
      const fieldToAdd = {
        label: `${field.required ? '* ' : ''}${field.tableLabel}`,
        tableLabel: field.tableLabel,
        order: field.order,
        fieldName: field.value,
        wrapText: true,
        hideDefaultActions: true,
        type: 'inputGeneric',
        typeAttributes: {
          type: field.type,
          recordId: { fieldName: '_id' },
          editable: field.isEditable,
          required: field.required,
          fieldName: field.value,
          isNew: { fieldName: 'isNew' },
          isDeleted: { fieldName: 'isDeleted' },
          config: {
            maxLength: field.maxLength,
            defaultValue: field.defaultValue,
            parentObjectName: field.parentObjectName,
            options: field.options,
            scale: field.scale,
            precision: field.precision,
            isHTML: field.isHTML,
            isMulti: field.isMulti,
          },
          value: {
            fieldName: field.value,
          },
        },
      };

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
    this.fieldsToDisplayTable = sortArrayByProperty(this.fieldsToDisplayTable, 'order');
  }
}
