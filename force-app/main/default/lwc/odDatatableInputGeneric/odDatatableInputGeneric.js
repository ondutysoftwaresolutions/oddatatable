import { LightningElement, api } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import OD_DatatableResource from '@salesforce/resourceUrl/OD_Datatable';
import CURRENCY_SYMBOL from '@salesforce/i18n/number.currencySymbol';
import DATE_FORMAT from '@salesforce/i18n/dateTime.shortDateFormat';
import CURRENCY_CODE from '@salesforce/i18n/currency';
import {
  FIELD_TYPES,
  TEXT_FIELDS,
  NUMERIC_FIELDS,
  YES_NO,
  LOCAL_SIDE_SEARCH,
  SERVER_SIDE_SEARCH,
} from 'c/odDatatableConstants';
import { isEmpty } from 'c/odDatatableUtils';

export default class ODInputGeneric extends LightningElement {
  @api fieldName;
  @api type;
  @api editable;
  @api value;
  @api placeholder;
  @api options;
  @api label;
  @api isMulti;
  @api required;
  @api helpText;
  @api defaultValue;
  @api autoFocus = false;
  @api parentObjectName;
  @api lookupConfiguration;
  @api isLoading = false;
  @api opened = false;
  @api insidePopupHeight = 0;
  @api extraLabelClasses = '';
  @api extraCheckboxClasses = '';
  @api extraContainerClasses = '';
  @api toggleValueActive = 'Active';
  @api toggleValueInactive = 'Inactive';
  @api toggleLabel;
  @api insideDatatable = false;
  @api maxLength = 255;
  @api maxNumber;
  @api minNumber = 0;
  @api isHtml = false;
  @api scale = 2;
  @api precision = 18;
  @api afterValidate = false;
  @api currentRecordId;
  @api dropdownOptionClasses;
  @api minDate = '1924-01-01';
  @api maxDate = '2124-12-31';
  @api isFirstRecord;
  @api isLastRecord;
  @api isFirstColumn;
  @api isLastColumn;
  @api withSharing = false;
  @api richTextFormats = [
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'indent',
    'align',
    'link',
    'image',
    'clean',
    'table',
    'header',
    'color',
    'background',
    'code',
    'code-block',
    'script',
    'blockquote',
    'direction',
  ];
  @api dropdownTopPositionShift = 0;

  currencyCode = CURRENCY_CODE;
  lookupSelectedLabel;

  _insideTableOpen = false;
  _alreadyRendered = false;

  connectedCallback() {
    if (!this.insideDatatable) {
      Promise.all([loadStyle(this, `${OD_DatatableResource}/css/main.css`)]);
    }
  }

  renderedCallback() {
    if (!this._alreadyRendered && this.afterValidate) {
      // check the inputs
      const elementInput = this.template.querySelector('lightning-input');
      const elementTextarea = this.template.querySelector('lightning-textarea');
      const elementRichTextarea = this.template.querySelector('lightning-input-rich-text');

      // inputs
      if (elementInput) {
        elementInput.reportValidity();
      }

      // text areas
      if (elementTextarea) {
        elementTextarea.reportValidity();
      }

      // rich text areas
      if (elementRichTextarea) {
        elementRichTextarea.reportValidity();
      }

      this._alreadyRendered = true;
    }
  }

  // =======================================================================================================================================================================================================================================
  // getter methods
  // =======================================================================================================================================================================================================================================
  get showLabel() {
    return this.label;
  }

  get loaded() {
    return !this.isLoading;
  }

  get variantToggle() {
    return this.toggleLabel ? 'label-stacked' : 'label-hidden';
  }

  get labelToggle() {
    return this.toggleLabel || ' ';
  }

  get theValue() {
    if (!isEmpty(this.value)) {
      if (this.lookupSelectedLabel && this.isDisabled) {
        return this.lookupSelectedLabel;
      }

      // if it's an array and disabled, do a space separated value return
      if (Array.isArray(this.value) && this.isDisabled) {
        let result = '';
        this.value.forEach((vl) => {
          result += vl.label + ' ';
        });

        return result;
      }

      // if it's a text with html, add a title to images or any html tag that has an alt value
      if (this.isTextWithHTML) {
        if (this.value.includes('alt')) {
          const indexOfAlt = this.value.indexOf('alt="') + 5;
          const title = `title="${this.value.substring(indexOfAlt, this.value.indexOf('"', indexOfAlt))}"`;

          return this.value.replace('alt', `${title} alt`);
        }
      }

      return this.value;
    }

    // set the default and dispatch
    if (this.defaultValue) {
      return this.defaultValue;
    }

    return undefined;
  }

  get toggleValue() {
    return this.theValue === YES_NO.YES ? true : false;
  }

  get requiredStar() {
    return this.editable && this.required ? '*' : '';
  }

  get hasHelpText() {
    return this.helpText;
  }

  get theType() {
    if (this.type === FIELD_TYPES.URL) {
      return FIELD_TYPES.TEXT;
    }

    return this.type || FIELD_TYPES.TEXT;
  }

  get isTextType() {
    return TEXT_FIELDS.includes(this.theType) || !this.theType;
  }

  get isText() {
    return this.theType === FIELD_TYPES.TEXT && !this.isTextWithHTML;
  }

  get isTextWithHTML() {
    return this.theType === FIELD_TYPES.TEXT && /<[a-z][\s\S]*>/i.test(this.value);
  }

  get isUrl() {
    return this.theType === FIELD_TYPES.URL;
  }

  get isPhone() {
    return this.theType === FIELD_TYPES.PHONE;
  }

  get isEmail() {
    return this.theType === FIELD_TYPES.EMAIL;
  }

  get isSelect() {
    return (
      (LOCAL_SIDE_SEARCH.includes(this.theType) && this.options.length > 0) || SERVER_SIDE_SEARCH.includes(this.theType)
    );
  }

  get isCheckbox() {
    return this.theType === FIELD_TYPES.CHECKBOX;
  }

  get isCurrency() {
    return this.theType === FIELD_TYPES.CURRENCY;
  }

  get isPercentage() {
    return this.theType === FIELD_TYPES.PERCENTAGE;
  }

  get isNumber() {
    return NUMERIC_FIELDS.includes(this.theType);
  }

  get isDate() {
    return this.theType === FIELD_TYPES.DATE;
  }

  get isDatetime() {
    return this.theType === FIELD_TYPES.DATETIME;
  }

  get isTextArea() {
    return this.theType === FIELD_TYPES.TEXTAREA && !this.isHtml;
  }

  get isRichTextArea() {
    return (this.theType === FIELD_TYPES.TEXTAREA && this.isHtml) || this.theType === FIELD_TYPES.RICH_TEXTAREA;
  }

  get isRadioButtonType() {
    return this.theType === FIELD_TYPES.RADIO_BUTTON_TYPE;
  }

  get isDisabled() {
    return !this.editable;
  }

  get isToggle() {
    return this.theType === FIELD_TYPES.TOGGLE;
  }

  get isOpened() {
    if (this.insideDatatable) {
      return this._insideTableOpen;
    }

    return this.opened;
  }

  get decimalsFormat() {
    if (this.isPercentage || this.isCurrency || (this.isNumber && this.theType !== FIELD_TYPES.INTEGER)) {
      return this.scale;
    }

    return 0;
  }

  get theMaxNumber() {
    if (this.maxNumber) {
      return this.maxNumber;
    }

    const integerPart = Math.pow(10, this.precision) - 1;

    if (this.scale > 0) {
      return parseFloat(`${integerPart}.${Math.pow(10, this.scale) - 1}`);
    }

    return integerPart;
  }

  get decimalsStep() {
    if (this.scale > 0) {
      return 1 / Math.pow(10, this.scale);
    }

    return 1;
  }

  get theOptions() {
    if (this.options) {
      return JSON.parse(JSON.stringify([...this.options]));
    }

    return null;
  }

  get currencyPlaceholder() {
    return this.placeholder || CURRENCY_SYMBOL;
  }

  get numberPlaceholder() {
    return this.placeholder || (this.insideDatatable ? this.label : '');
  }

  get datePlaceholder() {
    return this.placeholder || DATE_FORMAT;
  }

  get percentPlaceholder() {
    return this.placeholder || '%';
  }

  get labelClasses() {
    return `slds-form-element__label slds-grid slds-no-flex ${this.extraLabelClasses}`;
  }

  get checkboxClasses() {
    return `slds-p-around--xx-small slds-size--1-of-1 slds-align-content-center checkbox editable ${this.extraCheckboxClasses}`;
  }

  get containerClasses() {
    const isFormControl =
      this.extraContainerClasses && this.extraContainerClasses.includes('slds-form-element__control');

    return `slds-is-relative errorTooltip ${isFormControl ? '' : 'container'} ${this.extraContainerClasses || ''} ${
      this.isFirstColumn ? 'firstColumn' : ''
    } ${this.isLastColumn ? 'lastColumn' : ''} ${this.isFirstRecord ? 'firstRecord' : ''} ${
      this.isLastRecord ? 'lastRecord' : ''
    }`;
  }

  get richTextAreaValid() {
    return this.required && this.theValue;
  }

  // =======================================================================================================================================================================================================================================
  // private methods
  // =======================================================================================================================================================================================================================================
  _doUpdateField(name, value, isValid = true) {
    const detail = {
      fieldName: name,
      value: value,
      isValid: isValid,
    };

    const event = new CustomEvent('updatefield', { detail });

    this.dispatchEvent(event);
  }

  // =======================================================================================================================================================================================================================================
  // handler methods
  // =======================================================================================================================================================================================================================================
  handleOnFocusDropdown(event) {
    if (this.insideDatatable) {
      this._insideTableOpen = true;
    } else {
      const detail = {
        fieldName: event.target.name,
      };

      const customEvent = new CustomEvent('focusdropdown', { detail });

      this.dispatchEvent(customEvent);
    }
  }

  handleOnBlurDropdown(event) {
    if (this.insideDatatable) {
      this._insideTableOpen = false;
    } else {
      const detail = {
        fieldName: event.target.name,
      };

      const customEvent = new CustomEvent('blurdropdown', { detail });

      this.dispatchEvent(customEvent);
    }
  }

  handleChangeInput(event) {
    event.target.reportValidity();
    this._doUpdateField(event.target.name, event.target.value, event.target.checkValidity());
  }

  handleChangeToggle(event) {
    this._doUpdateField(event.target.name, event.detail.checked ? YES_NO.YES : YES_NO.NO);
  }

  handleChangeInputRichTextarea(event) {
    const valid = (this.required && event.target.value) || !this.required;

    this._doUpdateField(event.target.dataset.name, event.target.value, valid);
  }

  handleChangeInputTextarea(event) {
    event.target.reportValidity();
    this._doUpdateField(event.target.dataset.name, event.target.value, event.target.checkValidity());
  }

  handleChangeNumber(event) {
    event.target.reportValidity();
    const valueToSend = this.decimalsFormat > 0 ? parseFloat(event.target.value) : parseInt(event.target.value, 10);
    this._doUpdateField(event.target.name, valueToSend, event.target.checkValidity());
  }

  handleChangeDecimal(event) {
    event.target.reportValidity();
    this._doUpdateField(event.target.name, parseFloat(event.target.value), event.target.checkValidity());
  }

  handleSelectOption(event) {
    this._doUpdateField(event.target.name, event.detail.value);
  }

  handleChangeCheckbox(event) {
    this._doUpdateField(event.target.name, event.detail.checked);
  }

  handleChangeLookupSelectedLabel(event) {
    this.lookupSelectedLabel = event.detail.label;
  }

  @api
  handleResetField(fieldSelector) {
    this.template.querySelector(fieldSelector).value = '';
  }
}
