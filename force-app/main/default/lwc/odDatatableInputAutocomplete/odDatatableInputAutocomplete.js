import { LightningElement, api } from 'lwc';
import getRecordsForLookup from '@salesforce/apex/OD_DatatableConfigEditorController.getRecordsForLookup';
import getLookupRecord from '@salesforce/apex/OD_DatatableConfigEditorController.getLookupRecord';
import { SERVER_SIDE_SEARCH } from 'c/odDatatableConstants';
import { isEmpty, reduceErrors } from 'c/odDatatableUtils';

const DOWN = 'down';
const UP = 'up';
const optionSelectedClass = 'option-selected';
const optionHoverClass = 'option-hover';

export default class ODInputAutocomplete extends LightningElement {
  @api isMulti;
  @api type;
  @api classes;
  @api placeholder;
  @api value;
  @api options;
  @api name;
  @api elementId;
  @api required;
  @api disabled;
  @api autoFocus = false;
  @api showOptionImage = false;
  @api objectName;
  @api opened = false;
  @api containerHeight = 0;
  @api currentRecordId;
  @api serverSideConfiguration;
  @api afterValidate = false;
  @api dropdownOptionClasses = 'slds-input slds-input--bare slds-listbox__item slds-p-left--none';
  @api topPositionShift = 0;

  // tracked
  isSearching = false;
  filteredOptions = [];
  searchText;

  // private variables
  _searched = false;
  _wasSelected = false;
  _valueToCompare;
  _alreadyRendered = false;

  // =======================================================================================================================================================================================================================================
  // lifecycle method
  // =======================================================================================================================================================================================================================================
  connectedCallback() {
    if (this.autoFocus) {
      this.handleEmptyAndFocus();
    }
  }

  renderedCallback() {
    if (!this._alreadyRendered && this.afterValidate) {
      // check the inputs
      const elementInput = this.template.querySelector('lightning-input');

      // inputs
      if (elementInput) {
        elementInput.reportValidity();
      }

      this._alreadyRendered = true;
    } else {
      // if it's server search perform the search and then select, and we didn't already rendered
      if (this.isServerSearch && this.value !== this._valueToCompare && !this.isSearching) {
        this._doSearchSelectedRecord();
      }
    }
  }

  // =======================================================================================================================================================================================================================================
  // getter methods
  // =======================================================================================================================================================================================================================================
  get isServerSearch() {
    return SERVER_SIDE_SEARCH.includes(this.type);
  }

  get noOptionText() {
    return this.isServerSearch && !this._searched && this.opened && !this.isSearching
      ? 'Start typing...'
      : 'No options found.';
  }

  get thePlaceholder() {
    return this.placeholder || 'Select...';
  }

  get noOptionClasses() {
    return `${this.dropdownOptionClasses} ${this.isServerSearch ? '' : 'slds-align--absolute-center'}`;
  }

  get showInputSearch() {
    return (this.isServerSearch && !this.value) || !this.isServerSearch;
  }

  get optionsToShow() {
    // if we have filtered options, show that
    if (
      this.filteredOptions.length !== 0 ||
      (this.filteredOptions.length === 0 && this.searchText) ||
      (this.isMulti && this.filteredOptions.length === 0 && this.parsedValue.length === this._parsedOptions.length)
    ) {
      return this.filteredOptions;
    }

    return this._doBuildOptions();
  }

  get dropdownClasses() {
    let dropdownClasses = `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${this.name}`;

    // add the open class if opened
    if (this.opened) {
      dropdownClasses += ' slds-is-open';
    }

    return dropdownClasses;
  }

  get _parsedOptions() {
    const result = JSON.parse(JSON.stringify([...this.options]));
    return result;
  }

  get iconName() {
    return `utility:${this.opened ? 'search' : 'chevrondown'}`;
  }

  get pillsValueToShow() {
    const result = [];
    if (Array.isArray(this.parsedValue)) {
      this.parsedValue.forEach((element) => {
        if (typeof element === 'object') {
          result.push(element);
        } else {
          // find the object in the array of options
          const record = this.options.find((opt) => opt.value === element);
          if (record) {
            result.push(record);
          } else {
            result.push({
              label: 'Label not found',
              value: element,
            });
          }
        }
      });
    }

    return result;
  }

  get parsedValue() {
    if (!this.value) {
      if (this.isMulti) {
        return [];
      }

      return null;
    }

    let valueToUse = this.value;

    if (this.isMulti && !Array.isArray(valueToUse)) {
      valueToUse = this.value.split(';');
    }

    if (Array.isArray(valueToUse)) {
      return JSON.parse(JSON.stringify([...valueToUse]));
    }

    return valueToUse;
  }

  get parsedServerSideConfiguration() {
    return this.serverSideConfiguration ? JSON.parse(this.serverSideConfiguration) : null;
  }

  get positionDropdown() {
    // get the element
    let element = this.template.querySelector(`lightning-input[data-name="${this.name}"]`);
    const maxHeight = 250;

    if (element) {
      // if it's a multi picklist get the positioning of the parent element (DIV)
      if (this.isMulti) {
        element = element.parentElement;
      }

      const bounding = element.getBoundingClientRect();

      const topPosition = bounding.top + bounding.height - this.topPositionShift;
      let top = `${topPosition}px`;
      let bottom = 'auto';

      let windowHeight = window.innerHeight;

      if (this.containerHeight > 0) {
        if (windowHeight - this.containerHeight < maxHeight) {
          windowHeight = this.containerHeight;
        }
      }

      // if we are near the bottom we need to change to open the dropdown up
      if (windowHeight - topPosition < maxHeight) {
        top = 'auto';
        bottom = `${windowHeight - bounding.top}px`;
      }

      // if it's inside an scrollablle content then do that for left and transform
      let left = 'unset';

      const parentTableElement = element.closest('table');
      if (parentTableElement) {
        if (parentTableElement.scrollWidth > parentTableElement.clientWidth) {
          left = `${bounding.left - 90}px`;
        }
      }

      return `position: fixed; max-height: ${maxHeight}px;top: ${top}; bottom: ${bottom}; max-width: ${bounding.width}px; transform: none; left: ${left};`;
    }

    return '';
  }

  get searchTextToShow() {
    if (this.disabled && this.value) {
      return this.value;
    }

    if (!isEmpty(this.searchText)) {
      return this.searchText;
    }

    return this._getLabelSelected(false);
  }

  // =======================================================================================================================================================================================================================================
  // private methods
  // =======================================================================================================================================================================================================================================
  // function that build the options with the right css class
  _doBuildOptions(newValue = undefined) {
    const options = JSON.parse(JSON.stringify(this._parsedOptions));
    options.forEach((opt) => {
      opt.classes = `${this.dropdownOptionClasses}`;
      if (opt.value === (newValue || this.parsedValue)) {
        opt.classes += ` ${optionSelectedClass} ${optionHoverClass}`;
      }
    });

    // for multi use filtered options so we can remove already selected
    this.filteredOptions = this._doFilterSelectedOptions(options);

    return options;
  }

  // function to select the option with the keyboard (navigation with arrow down/up keys)
  _doSelectOptionWithKeyboard(event, liSelected, direction) {
    this.handleClickInside(event);
    const li = this.template.querySelectorAll('li');
    if (liSelected) {
      const next = direction === DOWN ? liSelected.nextElementSibling : liSelected.previousElementSibling;
      if (next) {
        liSelected.classList.remove(optionHoverClass);
        next.classList.add(optionHoverClass);
        liSelected.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } else {
        event.stopPropagation();
        event.preventDefault();
      }
    } else {
      if (li && li[0]) {
        li[0].classList.add(optionHoverClass);
        li[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
  }

  // function to get the current selected label
  _getLabelSelected(dispatchSelect = true) {
    let labelSelected;

    if (!this.parsedValue || this._parsedOptions.length === 0) {
      labelSelected = '';
    } else {
      // find the record by value
      const record = this._parsedOptions.find((opt) => opt.value === this.parsedValue);

      // if nothing found, return, otherwise return the label
      if (!record) {
        labelSelected = '';
      } else {
        labelSelected = record.label;

        if (dispatchSelect) {
          this._doDispatchSelect({ value: record.value });
        }
      }
    }

    return labelSelected;
  }

  // function to get the current selected element
  _getSelectedElement() {
    return this.template.querySelector(`li.${optionSelectedClass}`);
  }

  // function to get the current hovered element
  _getCurrentHoveredElement() {
    return this.template.querySelector(`li.${optionHoverClass}`);
  }

  // function to clear all the hovered elements when opening the dropdown
  _doCleanHoveredElements() {
    this.template.querySelectorAll('li').forEach((el) => {
      if (el.classList.contains(optionSelectedClass)) {
        el.classList.add(optionHoverClass);
      } else {
        el.classList.remove(optionHoverClass);
      }
    });
  }

  // function to dispatch the selection
  _doDispatchSelect({ value, ...other }) {
    // dispatch the select event
    const event = new CustomEvent('select', {
      detail: {
        value: value,
        name: this.name,
        ...other,
      },
    });
    this.dispatchEvent(event);
  }

  // function to dispatch the onblur
  _doDispatchBlur() {
    // dispatch the select event
    const event = new CustomEvent('blur');
    this.dispatchEvent(event);
  }

  _doDispatchFocus() {
    const event = new CustomEvent('focus');
    this.dispatchEvent(event);
  }

  _doDispatchSelectLabelLookup(label) {
    const event = new CustomEvent('selectlookup', {
      detail: {
        label: label,
      },
    });
    this.dispatchEvent(event);
  }

  _doFilterSelectedOptions(options) {
    let result = [];
    if (this.isMulti) {
      // add to the filtered only if it's not selected already
      options.forEach((opt) => {
        const findIndex = this.pillsValueToShow.findIndex((pv) => pv.value === opt.value);

        if (findIndex === -1) {
          result.push(opt);
        }
      });
    } else {
      result = options;
    }

    return result;
  }

  _doSearchSelectedRecord() {
    this.isSearching = true;

    const objectToSend = { objectName: this.objectName, value: this.value };

    if (this.parsedServerSideConfiguration) {
      objectToSend.displayField = this.parsedServerSideConfiguration.displayField || null;
    }

    getLookupRecord(objectToSend)
      .then((res) => {
        this._valueToCompare = this.value;
        this.isSearching = false;

        if (res) {
          this.searchText = res.label;

          this._doDispatchSelectLabelLookup(res.label);
        }
      })
      .catch((error) => {
        this.isSearching = false;
        this.filteredOptions = [{ value: '', label: reduceErrors(error) }];
      });
  }

  // do the callout to get the choices
  _doSearchOptions() {
    const searchTxt = this.searchText;

    const objectToSend = { objectName: this.objectName, searchText: searchTxt };

    if (this.parsedServerSideConfiguration) {
      objectToSend.searchGroup = this.parsedServerSideConfiguration.searchGroup || null;
      objectToSend.displayField = this.parsedServerSideConfiguration.displayField || null;
      objectToSend.whereCondition = this.parsedServerSideConfiguration.whereCondition || null;
      objectToSend.orderCondition = this.parsedServerSideConfiguration.orderCondition || null;
      objectToSend.limitRecords = this.parsedServerSideConfiguration.limit
        ? parseInt(this.parsedServerSideConfiguration.limit, 10)
        : null;
    }

    getRecordsForLookup(objectToSend)
      .then((res) => {
        this._searched = true;

        this.filteredOptions = res.filter((rs) => rs.value !== this.currentRecordId);
        this.isSearching = false;
      })
      .catch((error) => {
        this.isSearching = false;
        this.filteredOptions = [{ value: '', label: reduceErrors(error) }];
      });
  }

  // function to open the dropdown
  _doOpen(e) {
    this._doDispatchFocus();
    this._searched = false;

    // if we have an event, manage the click inside
    if (e) {
      this.handleClickInside(e);
    }

    // prevent scrollbar main area
    this._doSwitchMainScrollOnOff(false);

    this.searchText = '';

    // wait for the open, and scroll into the selected one if any (only if not server side search)
    if (!this.isServerSearch && !this.isMulti) {
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        const selectedElement = this._getSelectedElement();
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
        }
      });
    }
  }

  // function to close the dropdown
  _doClose(setLabel = true) {
    this._searched = false;

    // allow scrollbar main area
    this._doSwitchMainScrollOnOff(true);

    this.filteredOptions = [];

    if (this.isServerSearch && !this._wasSelected) {
      this.searchText = undefined;
    }

    // if the value is undefined, clean the value
    if (setLabel) {
      this.searchText = null;
    }
  }

  _doSwitchMainScrollOnOff(enable) {
    const bodyElement = document.body;

    if (enable) {
      bodyElement.classList.remove('od-datatable-dropdown-open');
    } else {
      bodyElement.classList.add('od-datatable-dropdown-open');
    }
  }

  // =======================================================================================================================================================================================================================================
  // handler methods
  // =======================================================================================================================================================================================================================================
  // function to manage the click inside the dropdown, this prevents the dropdown to close when clicking inside
  handleClickInside(e) {
    e.stopPropagation();
    if (e.preventDefault) {
      e.preventDefault();
    }
  }

  // this function opens the dropdown
  handleOpenDropdown(e) {
    this._doOpen(e);
  }

  // function that manage the search when using the input
  handleSearch(event) {
    if (!this.opened) {
      this._doOpen(event);
    }
    this.searchText = event.detail.value;

    // if the search is not server side (local), filter the array, otherwise do the callout to get the values
    if (!this.isServerSearch) {
      this.filteredOptions = this._doFilterSelectedOptions(this._parsedOptions).filter((option) => {
        return option.label.toLowerCase().includes(this.searchText.toLowerCase());
      });
    } else {
      // clear the timeout and set it again
      clearTimeout(this._timerId);

      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this._timerId = window.setTimeout(() => {
        if (this.searchText && this.searchText.length >= 3) {
          this._wasSelected = false;
          this.isSearching = true;
          this._doSearchOptions();
        } else {
          this.filteredOptions = [];
        }
      }, 500);
    }

    if (!this.opened) {
      this._doDispatchFocus();
    }
  }

  // function to empty and focus the input element (for multi lookups only or autofocus = true)
  handleEmptyAndFocus() {
    // clean the search and focus
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.searchText = '';
      this._searched = false;

      // get the input element
      const inputElement = this.template.querySelector('lightning-input');

      inputElement.value = '';
      inputElement.focus();
    });
  }

  // function to handle the selection of the options
  handleSelect(e) {
    e.stopPropagation();
    let value = e.currentTarget.dataset.value;

    if (value) {
      const selectedOption = this.optionsToShow.find((opt) => opt.value === value);

      // if it's a multi lookup add the value to the array
      if (this.isMulti) {
        // remove it from the available options
        const index = this.filteredOptions.findIndex((op) => op.value === value);
        this.filteredOptions.splice(index, 1);

        // add to the array of values
        value = [
          ...this.pillsValueToShow,
          {
            ...selectedOption,
          },
        ];

        this.handleEmptyAndFocus(e);
      } else {
        this.searchText = selectedOption.label;

        // build the options again
        if (!this.isServerSearch) {
          this.filteredOptions = this._doBuildOptions(value);
        } else {
          this._wasSelected = true;
          this._doDispatchSelectLabelLookup(selectedOption.label);
        }

        // Close the dropdown
        this._doClose(false);
      }

      // dispatch the select event
      this._doDispatchSelect({ ...selectedOption, value });
    } else {
      this.handleClickInside(e);
    }
  }

  // function to close the dropdown when moving away from the input (and not going away from the dropdown)
  handleBlur(e) {
    this._doClose(!this.isServerSearch);
    // dispatch onblur, just in case a parent component is listening
    this._doDispatchBlur();
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      // get the input element
      const inputElement = this.template.querySelector('lightning-input');
      inputElement.reportValidity();
    });
  }

  // function to manage the key pressed while the dropdown in opened
  handleKeyDown(e) {
    let liSelected = this._getCurrentHoveredElement();
    switch (e.key) {
      case 'ArrowUp':
        this._doSelectOptionWithKeyboard(e, liSelected, UP);
        break;
      case 'ArrowDown':
        if (!this.opened) {
          this._doOpen(e);
        }
        this._doSelectOptionWithKeyboard(e, liSelected, DOWN);
        break;
      case 'Enter': {
        if (!this.opened) {
          this._doOpen(e);
        } else {
          if (liSelected) {
            this.handleSelect({
              currentTarget: liSelected,
              stopPropagation: e.stopPropagation,
            });
            this._doDispatchBlur();
          }
        }
        break;
      }
      case 'Escape': {
        e.stopPropagation();
        this._doClose();
        this._doDispatchBlur();
        break;
      }
      case 'Tab': {
        this._doClose();
        this._doDispatchBlur();
        break;
      }
      default:
    }
  }

  // function to remove the option in the multi lookup pills
  handleRemoveOption(e) {
    const value = e.currentTarget.dataset.id;
    const newValue = [...this.pillsValueToShow];

    this.handleEmptyAndFocus(e);

    // remove the object from the array
    const index = newValue.findIndex((op) => op.value === value);
    newValue.splice(index, 1);

    // dispatch the change
    this._doDispatchSelect({ value: newValue });
  }

  handleClearSelection() {
    this._doDispatchSelect({ value: '' });
    this.handleEmptyAndFocus();

    this._valueToCompare = '';
    this.searchText = '';
    this._doOpen();
  }
}
