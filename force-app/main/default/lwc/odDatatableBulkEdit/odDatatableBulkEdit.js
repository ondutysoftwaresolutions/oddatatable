import { LightningElement, api, track } from 'lwc';
import { getPopupHeight, getBodyPopupClasses } from 'c/odDatatableUtils';
import { FIELD_TYPES, YES_NO } from 'c/odDatatableConstants';
import UPDATE_BUTTON_LABEL from '@salesforce/label/c.od_Bulk_Edit_Update_Button';
import CLOSE_BUTTON_LABEL from '@salesforce/label/c.od_Close_Button';
import TOGGLE_LABEL from '@salesforce/label/c.od_Bulk_Edit_Toggle_Label';

export default class OdDatatableBulkEdit extends LightningElement {
  @api title;
  @api fields;

  @track fieldsToShow = [];

  labels = {
    updateButton: UPDATE_BUTTON_LABEL,
    closeButton: CLOSE_BUTTON_LABEL,
    toggleLabel: TOGGLE_LABEL,
  };

  fieldTypes = FIELD_TYPES;
  yesNo = YES_NO;
  onlyEmpty = YES_NO.NO;
  popupHeight;

  // private variables
  _alreadyRendered = false;

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    this.fieldsToShow = JSON.parse(JSON.stringify(this.fields));
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

  get disabledUpdate() {
    return this.fieldsToShow.some((fl) => fl._changed && !fl.isValid);
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleOnFocusDropdown(event) {
    const fieldName = event.detail.fieldName;

    this.fieldsToShow.forEach((fld) => {
      if (fld.fieldName === fieldName) {
        fld.opened = true;
      } else {
        fld.opened = false;
      }
    });
  }

  handleOnBlurDropdown(event) {
    const fieldName = event.detail.fieldName;

    const indexField = this.fieldsToShow.findIndex((fl) => fl.fieldName === fieldName);

    if (indexField !== -1) {
      this.fieldsToShow[indexField].opened = false;
    }
  }

  handleToggleIfEmpty(event) {
    this.onlyEmpty = event.detail.value;
  }

  handleUpdateField(event) {
    const value = event.detail.value;
    const fieldName = event.detail.fieldName;
    const isValid = event.detail.isValid;

    const indexField = this.fieldsToShow.findIndex((fl) => fl.fieldName === fieldName);

    this.fieldsToShow = [
      ...this.fieldsToShow.slice(0, indexField),
      {
        ...this.fieldsToShow[indexField],
        value: value,
        isValid: isValid,
        _changed: true,
      },
      ...this.fieldsToShow.slice(indexField + 1),
    ];
  }

  handleUpdateRows() {
    const detail = {
      onlyEmpty: this.onlyEmpty === YES_NO.YES,
      fields: this.fieldsToShow.filter((fl) => fl._changed),
    };

    const event = new CustomEvent('updaterows', { detail });
    this.dispatchEvent(event);
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }
}
