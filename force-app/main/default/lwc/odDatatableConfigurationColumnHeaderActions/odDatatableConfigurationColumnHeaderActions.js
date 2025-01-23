import { LightningElement, api, track } from 'lwc';
import { generateRandomString } from 'c/odDatatableUtils';
import { FIELD_TYPES, HEADER_ACTION_TYPES } from 'c/odDatatableConstants';

export default class OdDatatableConfigurationColumnHeaderActions extends LightningElement {
  @api hideDefault = false;
  @api column;
  @api actions;

  @track actionsToDisplayTable = [];

  hideDefaultActions = true;
  hasChanged = false;
  errorMessage = false;
  fieldTypes = FIELD_TYPES;

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    this.hideDefaultActions = this.hideDefault;
    this._buildRecords();
  }

  // =================================================================
  // getters methods
  // =================================================================
  get disabledSave() {
    let disabled = false;

    if (this.hasChanged) {
      if (this.errorMessage) {
        disabled = true;
      } else {
        this.actionsToDisplayTable.forEach((action) => {
          if (!action.label || !action.valueToSet) {
            disabled = true;
          }
        });
      }
    } else {
      disabled = true;
    }

    return disabled;
  }

  // =================================================================
  // private methods
  // =================================================================
  _buildRecords() {
    const result = [];
    if (this.actions) {
      const actions = JSON.parse(this.actions);

      if (actions.length > 0) {
        actions.forEach((act) => {
          const newObject = {
            ...act,
            id: generateRandomString(),
          };

          result.push(newObject);
        });

        this.actionsToDisplayTable = result;
      }
    }
  }

  _doUpdateField(id, objectToUpdate) {
    const actionIndex = this.actionsToDisplayTable.findIndex((fl) => fl.id === id);
    this.actionsToDisplayTable[actionIndex] = {
      ...this.actionsToDisplayTable[actionIndex],
      ...objectToUpdate,
    };

    this.hasChanged = true;
  }

  // =================================================================
  // handler methods
  // =================================================================
  handleAdd() {
    const newObject = {
      id: generateRandomString(),
      label: '',
      checked: false,
      iconName: '',
      valueToSet: '',
    };

    this.actionsToDisplayTable.push(newObject);

    this.hasChanged = true;
  }

  handleDelete(event) {
    const id = event.target.dataset.id;

    const actionIndex = this.actionsToDisplayTable.findIndex((fl) => fl.id === id);

    this.actionsToDisplayTable = [
      ...this.actionsToDisplayTable.slice(0, actionIndex),
      ...this.actionsToDisplayTable.slice(actionIndex + 1),
    ];

    this.hasChanged = true;
  }

  handleUpdateDefaultActions(event) {
    this.hideDefaultActions = event.detail.value;
    this.hasChanged = true;
  }

  handleUpdateLabelSetValue(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    // check there is not another input with same name
    if (this.actionsToDisplayTable.some((action) => action.label === value)) {
      this.errorMessage = 'There is already another header action with the same label.';
    } else {
      this.errorMessage = false;
    }

    this._doUpdateField(id, { [fieldName]: value, type: HEADER_ACTION_TYPES.SET_VALUE, ...other });
  }

  handleUpdateSetValueField(event) {
    const { fieldName, value, ...other } = event.detail;
    const id = event.target.dataset.id;

    this._doUpdateField(id, { [fieldName]: value, type: HEADER_ACTION_TYPES.SET_VALUE, ...other });
  }

  handleClose() {
    const event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  handleSave() {
    const result = [];

    this.actionsToDisplayTable.forEach((action) => {
      const { id, ...other } = action;

      const name = other.label.toLowerCase().replace(/ /g, '_');

      result.push({ ...other, name });
    });

    // dispatch the save
    const event = new CustomEvent('save', {
      detail: { value: JSON.stringify(result), hideDefaultActions: this.hideDefaultActions },
    });

    this.dispatchEvent(event);
  }
}
