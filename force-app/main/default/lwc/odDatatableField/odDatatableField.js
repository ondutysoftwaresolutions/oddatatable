import { LightningElement, api } from 'lwc';
import { CUSTOM_FIELD_TYPES, EVENTS, YES_NO, HIDDEN_TYPE_OPTIONS, FIELD_TYPES } from 'c/odDatatableConstants';
import {
  doReplaceMergeField,
  formatDateForInput,
  getFieldsFromString,
  getSummarizeFieldTypeToDisplay,
} from 'c/odDatatableUtils';

export default class OdDatatableField extends LightningElement {
  @api recordId;
  @api record;
  @api type;
  @api editable = false;
  @api fieldName;
  @api value;
  @api isDeleted;
  @api isNew;
  @api config;
  @api required;

  connectedCallback() {
    // if it's a custom column field and is editable and it has a default value, dispatch it
    if (this.isEditable && this.defaultValue && this.config.isCustom && CUSTOM_FIELD_TYPES.includes(this.type)) {
      this._doDispatch(EVENTS.CHANGE, {
        value: this.defaultValue,
        isValid: true,
      });
    }
  }

  // =================================================================
  // getter methods
  // =================================================================
  get isEditable() {
    if (
      this.record._isGroupRecord ||
      this.record._isSummarizeRecord ||
      (this.record.UserRecordAccess && !this.record.UserRecordAccess.HasEditAccess && this.config.withSharing)
    ) {
      return false;
    }

    const editableValue = typeof this.editable === 'boolean' ? this.editable : this.editable === YES_NO.YES;

    return editableValue && !this.isDeleted;
  }

  get theType() {
    if (this.record._isSummarizeRecord || this.record._isGroupRecord) {
      return getSummarizeFieldTypeToDisplay(this.type);
    }

    return this.type;
  }

  get isRequired() {
    return this.required || this.config.required;
  }

  get defaultValue() {
    if (this.isEditable || this.isNew) {
      let defaultValue = this.config.defaultValue;

      if (defaultValue && typeof defaultValue === FIELD_TYPES.STRING && defaultValue.includes('{{')) {
        const fieldsToReplace = getFieldsFromString(defaultValue);

        if (fieldsToReplace[0].includes('Record.')) {
          defaultValue = doReplaceMergeField(defaultValue, fieldsToReplace[0], this.record);
        } else if (fieldsToReplace[0] === 'CurrentDate') {
          defaultValue = formatDateForInput(new Date());
        }
      }

      return defaultValue;
    }

    return undefined;
  }

  get isGroupRecordCollapsibleCell() {
    return this.record._isGroupRecord && this.record._isCollapsible;
  }

  get showField() {
    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
  }

  get cellClasses() {
    let cellClassesToUse = this.config.cellClasses || '';
    if (this.config.alignment) {
      cellClassesToUse = `${cellClassesToUse} slds-text-align--${this.config.alignment.toLowerCase()}`;
    }

    return this.isDeleted
      ? 'deleted-record'
      : `${cellClassesToUse} ${this.record?._isGroupRecord ? 'groupCell' : ''} ${this.record?._isSummarizeRecord ? 'summarizeCell' : ''}`;
  }

  get lookupConfig() {
    if (this.config.lookupConfig) {
      const parsed = JSON.parse(this.config.lookupConfig);

      // replace values with current record
      if (parsed.whereCondition) {
        // if it has some replacement variables
        if (parsed.whereCondition.includes('{{') && this.record) {
          const fieldsToReplace = getFieldsFromString(parsed.whereCondition);

          // assign the values at the beginning so we can start changing them
          let result = parsed;

          // for each record field, start the replace
          fieldsToReplace.forEach((fl) => {
            result.whereCondition = doReplaceMergeField(result.whereCondition, fl, this.record);
          });

          return JSON.stringify(result);
        }
      }

      return this.config.lookupConfig;
    }

    return null;
  }

  _doDispatch(type, detail) {
    const event = new CustomEvent('rowaction', {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        recordId: this.recordId,
        value: detail.value,
        fieldName: this.fieldName,
        isValid: detail.isValid,
        action: type,
      },
    });

    this.dispatchEvent(event);
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleUpdateField(e) {
    this._doDispatch(EVENTS.CHANGE, e.detail);
  }
}
