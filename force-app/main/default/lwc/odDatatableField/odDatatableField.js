import { LightningElement, api } from 'lwc';
import { EVENTS } from 'c/odDatatableConstants';

export default class OdDatatableField extends LightningElement {
  @api recordId;
  @api record;
  @api type;
  @api editable;
  @api fieldName;
  @api value;
  @api isDeleted;
  @api isNew;
  @api config;
  @api required;

  // =================================================================
  // getter methods
  // =================================================================
  get isEditable() {
    return this.editable && !this.isDeleted;
  }

  get defaultValue() {
    return this.isNew ? this.config.defaultValue : undefined;
  }

  get cellClasses() {
    return this.isDeleted ? 'deleted-record' : '';
  }

  get lookupConfig() {
    if (this.config.lookupConfig) {
      const parsed = JSON.parse(this.config.lookupConfig);

      // replace values with current record
      if (parsed.whereCondition) {
        // if it has some replacement variables
        if (parsed.whereCondition.includes('{{') && this.record) {
          const fieldsToReplace = this._getFieldsFromString(parsed.whereCondition);

          // assign the values at the beginning so we can start changing them
          let result = parsed;

          // for each record field, start the replace
          fieldsToReplace.forEach((fl) => {
            let regex = new RegExp('{{' + fl + '}}', 'g');

            // get the field name
            let fieldName = fl.replace(`Record.`, '');

            result.whereCondition = result.whereCondition.replace(regex, this.record[fieldName]);
          });

          return JSON.stringify(result);
        }
      }

      return this.config.lookupConfig;
    }

    return null;
  }

  // =================================================================
  // private methods
  // =================================================================
  _getFieldsFromString = (string) => {
    return string.match(/(?<={{)(.*?)(?=}})/g);
  };

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
