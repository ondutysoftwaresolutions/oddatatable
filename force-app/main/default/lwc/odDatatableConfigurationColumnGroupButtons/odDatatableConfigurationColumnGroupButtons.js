import { LightningElement, api, track } from 'lwc';
import { FIELD_TYPES } from 'c/odDatatableConstants';

export default class OdDatatableConfigurationColumnGroupButtons extends LightningElement {
  @api buttons;

  @track buttonsToDisplayTable = [];

  errorMessage = false;
  fieldTypes = FIELD_TYPES;

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    this._buildRecords();
  }

  // =================================================================
  // Getter methods
  // =================================================================
  get mainButtonOptions() {
    const result = this.buttonsToDisplayTable.filter((btn) => btn.mainButton);

    if (result.length > 0) {
      result.unshift({
        label: '\u00A0',
        value: '-1',
      });
    }

    return result;
  }

  // =================================================================
  // private methods
  // =================================================================
  _buildRecords() {
    const result = [];
    if (this.buttons) {
      const buttons = JSON.parse(JSON.stringify(this.buttons));

      if (buttons.length > 0) {
        buttons.forEach((btn) => {
          const newObject = {
            ...btn,
            label: btn.tableLabel,
            canBeMainButton: !btn.groupUnder || btn.groupUnder === -1,
          };

          result.push(newObject);
        });

        this.buttonsToDisplayTable = result;
      }
    }
  }

  _doUpdateField(value, objectToUpdate) {
    const btnIndex = this.buttonsToDisplayTable.findIndex((btn) => btn.value === value);
    this.buttonsToDisplayTable[btnIndex] = {
      ...this.buttonsToDisplayTable[btnIndex],
      ...objectToUpdate,
    };
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleGroupUnderOnFocusDropdown(e) {
    const value = e.target.dataset.value;

    this.buttonsToDisplayTable.forEach((btn) => {
      if (btn.value === value) {
        btn.opened = true;
      } else {
        btn.opened = false;
      }
    });
  }

  handleGroupUnderOnBlurDropdown() {
    this.buttonsToDisplayTable.forEach((btn) => {
      btn.opened = false;
    });
  }

  handleUpdateMainButton(event) {
    const { fieldName, value, ...other } = event.detail;
    const btnValue = event.target.dataset.value;

    this._doUpdateField(btnValue, { [fieldName]: value, ...other });

    // if false, update all the children too
    if (!value) {
      this.buttonsToDisplayTable
        .filter((btn) => btn.groupUnder === btnValue)
        .forEach((child) => {
          this._doUpdateField(child.value, { groupUnder: null, canBeMainButton: true });
        });
    }
  }

  handleUpdateGroupUnder(event) {
    const { fieldName, value, ...other } = event.detail;
    const btnValue = event.target.dataset.value;

    const valueToUse = value === -1 ? null : value;

    this._doUpdateField(btnValue, { [fieldName]: valueToUse, canBeMainButton: !valueToUse, ...other });
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    // dispatch the save
    const event = new CustomEvent('save', {
      detail: { value: this.buttonsToDisplayTable },
    });

    this.dispatchEvent(event);
  }
}
