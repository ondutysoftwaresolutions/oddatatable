import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { DATE_FIELDS, NUMERIC_FIELDS, TEXT_FIELDS, FIELD_TYPES } from 'c/odDatatableConstants';
import { generateRandomNumber } from 'c/odDatatableUtils';

export default class OdDatatablePreview extends LightningModal {
  @api configuration;

  get dummyData() {
    const result = [];

    for (let index = 0; index < 4; index++) {
      const newRecord = { Id: generateRandomNumber() };

      JSON.parse(this.configuration.columns.value).forEach((cl) => {
        let value;
        // text
        if (
          TEXT_FIELDS.includes(cl.typeAttributes.type) ||
          FIELD_TYPES.LONG_TEXTAREA === cl.typeAttributes.type ||
          FIELD_TYPES.TEXTAREA === cl.typeAttributes.type
        ) {
          value = `Test ${cl.label} ${index}`;
        }

        if (FIELD_TYPES.RICH_TEXTAREA === cl.typeAttributes.type) {
          value = `<span style="font-weight:bold">Test ${cl.label} ${index}</span>`;
        }

        // date
        if (DATE_FIELDS.includes(cl.typeAttributes.type)) {
          value = new Date().toISOString();
        }

        // numeric / currency / percentage
        if (
          NUMERIC_FIELDS.includes(cl.typeAttributes.type) ||
          FIELD_TYPES.CURRENCY === cl.typeAttributes.type ||
          FIELD_TYPES.PERCENTAGE === cl.typeAttributes.type
        ) {
          value = 10;
        }

        // checkbox
        if (FIELD_TYPES.CHECKBOX === cl.typeAttributes.type) {
          value = true;
        }

        // Picklists
        if (FIELD_TYPES.SELECT === cl.typeAttributes.type) {
          value = cl.typeAttributes.config.options[0].value;
        }

        // Multi picklists
        if (FIELD_TYPES.MULTISELECT === cl.typeAttributes.type) {
          value = `${cl.typeAttributes.config.options[0].value};${cl.typeAttributes.config.options[1].value}`;
        }

        newRecord[cl.fieldName] = value;
      });

      result.push(newRecord);
    }

    return result;
  }

  handleClose() {
    this.close();
  }
}
