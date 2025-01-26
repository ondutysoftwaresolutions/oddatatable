import { LightningElement, api, track } from 'lwc';
import Toast from 'lightning/toast';
import {
  getPopupHeight,
  getBodyPopupClasses,
  isEmpty,
  sortArrayByProperty,
  getFieldType,
  getPrecision,
  generateRandomString,
} from 'c/odDatatableUtils';
import {
  ALIGNMENT_OPTIONS,
  BUTTON_ICON_VARIANTS,
  BUTTON_VARIANTS,
  FIELD_TYPES,
  FORMATTED_TYPE_TO_SHOW,
  HEADER_ACTION_TYPES,
  CUSTOM_BUTTON_TYPES,
  INPUT_GENERIC_TYPE,
  CUSTOM_FIELD_TYPES,
  ROW_BUTTON_TYPE,
  HIDDEN_TYPE_OPTIONS,
  ICON_VARIANTS,
  ROW_BUTTON_CONFIGURATION,
  SHOW_AS_OPTIONS_FIELDS,
  SHOW_AS_OPTIONS_CUSTOM_BUTTONS,
  SHOW_AS_OPTIONS_CUSTOM_FIELDS,
  SUMMARIZE_OPTIONS,
} from 'c/odDatatableConstants';

export default class OdConfigurationColumns extends LightningElement {
  @api objectName;
  @api columns;
  @api builderContext;
  @api flows;
  @api allFields;

  @track fieldsToDisplayTable = [];
  @track fields = [];
  @track booleanFields = [];

  @track selectedFields = [];

  iconVariants = ICON_VARIANTS;
  buttonVariants = BUTTON_VARIANTS;
  buttonIconVariants = BUTTON_ICON_VARIANTS;
  popupHeight;
  isSelectFieldsOpened = false;
  errorMessage = false;
  fieldTypes = FIELD_TYPES;

  // lookup configuration
  showLookupConfiguration = false;
  lookupConfiguration;
  lookupObjectName;
  lookupFieldName;

  // flow input variables
  showFlowInputVariables = false;
  flowInputs;
  flowFieldName;
  flowSingle;
  flowMultiple;
  flowBottomNav;

  // header actions
  showHeaderActions = false;
  hideDefaultHeaderActions;
  headerActionFieldName;
  headerActionColumn;
  customHeaderActions;

  // private variables
  _alreadyRendered = false;
  _allFields;

  // =================================================================
  // lifecycle methods
  // =================================================================
  connectedCallback() {
    if (this.allFields && this.allFields.length > 0) {
      this._allFields = JSON.parse(JSON.stringify(this.allFields));

      this._selectFields();

      this._buildFieldsAvailable();
    } else {
      this.errorMessage = 'At least 1 field is required to be able to do Column Configuration';
    }
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
      // add the the is multiple for multi picklist
      rs.isMulti = this._isMulti(rs.type);
    });

    this.fields = result.filter((fld) => !fld.isMasterDetail);
    this.booleanFields = result.filter((fld) => fld.type === FIELD_TYPES.CHECKBOX);
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

  _buildOptionsForSummarize(type) {
    return SUMMARIZE_OPTIONS.filter((option) => {
      // Always include the all options to all types
      if (option.all) {
        return true;
      }

      // If the option has types specified, check if the given type is included
      if (option.types) {
        return option.types.includes(type);
      }

      return false;
    });
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
          classesType: selectedCustom.flow ? 'slds-size--1-of-1' : 'slds-size--10-of-12',
          typeSpec: typeSpec,
          hideDefaultActions: col.hideDefaultActions,
          headerActions: JSON.stringify(col.actions),
          precision: getPrecision(field),
          isMulti: this._isMulti(type),
          isEditable: col.typeAttributes.editable,
          required: col.typeAttributes.required,
          defaultValue: col.typeAttributes.config.defaultValue,
          initialWidth: col.initialWidth,
          alignment: col.typeAttributes.config.alignment || col.alignment,
          hidden: col.typeAttributes.config.hidden,
          hiddenType: col.typeAttributes.config.hiddenType,
          hiddenConditionField: col.typeAttributes.config.hiddenConditionField,
          hiddenIsRecordBased: col.typeAttributes.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value,
          summarize: col.typeAttributes.config.summarize,
          summarizeType: col.typeAttributes.config.summarizeType,
          buttonVariant: col.typeAttributes.config.buttonVariant,
          isButtonIcon: col.typeAttributes.config.isButtonIcon,
          buttonIconVariant: col.typeAttributes.config.buttonIconVariant,
          isLookup: type === FIELD_TYPES.LOOKUP,
          typeForDefault: type === FIELD_TYPES.LOOKUP ? FIELD_TYPES.SELECT : type,
          options: type === FIELD_TYPES.LOOKUP ? this._buildOptionsFromFlow(FIELD_TYPES.STRING) : field.options,
          order: col.order,
          lookupConfig: col.typeAttributes.config.lookupConfig,
          isCustom: col.typeAttributes.config.isCustom,
          isFieldColumn: !col.typeAttributes.config.isCustom,
          customType: col.typeAttributes.config.customType,
          isButton: CUSTOM_BUTTON_TYPES.includes(col.typeAttributes.config.customType),
          showAs: col.typeAttributes.config.showAs,
          column: col.typeAttributes.config.column || col.typeAttributes.config.showAsSingle,
          icon: col.typeAttributes.config.icon,
          showAsSingle: col.typeAttributes.config.showAsSingle,
          showInBottomNav: col.typeAttributes.config.showInBottomNav,
          showAsMultiple: col.typeAttributes.config.showAsMultiple,
          flowName: col.typeAttributes.config.flowName,
          iconName: col.typeAttributes.config.iconName,
          tooltip: col.typeAttributes.config.tooltip,
          iconVariant: col.typeAttributes.config.iconVariant,
          flowInputVariables: col.typeAttributes.config.flowInputVariables,
          flowNavigateNext: col.typeAttributes.config.flowNavigateNext,
          flowOptions: this.flows.filter((fl) => fl.type === col.typeAttributes.config.customType),
          waitForPlatformEvent: col.typeAttributes.config.waitForPlatformEvent,
          alignmentOptions: Object.values(ALIGNMENT_OPTIONS),
          hiddenTypeOptions: Object.values(HIDDEN_TYPE_OPTIONS),
          summarizeTypeOptions: this._buildOptionsForSummarize(type),
          canSummarize: !col.typeAttributes.config.hidden && !col.typeAttributes.config.isCustom,
          canHide: !col.typeAttributes.config.summarize && !col.typeAttributes.config.showInBottomNav,
          showAsOptions: !col.typeAttributes.config.isCustom
            ? SHOW_AS_OPTIONS_FIELDS
            : CUSTOM_BUTTON_TYPES.includes(col.typeAttributes.config.customType)
              ? SHOW_AS_OPTIONS_CUSTOM_BUTTONS
              : [SHOW_AS_OPTIONS_CUSTOM_FIELDS],
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

    // get the default show as option
    const defaultShowAs = [
      ...SHOW_AS_OPTIONS_CUSTOM_BUTTONS,
      ...[SHOW_AS_OPTIONS_CUSTOM_FIELDS],
      ...SHOW_AS_OPTIONS_FIELDS,
    ].find((cl) => cl.default);

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
        newField.showAs = defaultShowAs.value;
        newField.column = defaultShowAs.column;
        newField.alignment = ALIGNMENT_OPTIONS.LEFT.value;
        newField.hiddenType = HIDDEN_TYPE_OPTIONS.COLUMN.value;
        newField.icon = false;
        newField.alignmentOptions = Object.values(ALIGNMENT_OPTIONS);
        newField.hiddenTypeOptions = Object.values(HIDDEN_TYPE_OPTIONS);
        newField.summarizeTypeOptions = this._buildOptionsForSummarize(newField.type);
        newField.showAsSingle = defaultShowAs.single;
        newField.showAsMultiple = false;
        newField.showInBottomNav = false;
        newField.showAsOptions = !newField.isCustom ? SHOW_AS_OPTIONS_FIELDS : [];
        newField.canHide = true;
        newField.canSummarize = !newField.isCustom;

        // if typespec is an array
        if (Array.isArray(typeSpec)) {
          // eslint-disable-next-line no-unused-vars
          const { value, label, ...other } = typeSpec[0];
          newField.customType = value;
          newField.flowOptions = this.flows.filter((flow) => flow.type === value);
          newField.isButton = CUSTOM_BUTTON_TYPES.includes(newField.customType);

          newField.showAsOptions = newField.isButton ? SHOW_AS_OPTIONS_CUSTOM_BUTTONS : [SHOW_AS_OPTIONS_CUSTOM_FIELDS];

          newField = {
            ...newField,
            ...other,
          };
        }
        iteration++;

        return { ...fl, ...newField };
      } else {
        // get the field from the fields to display table
        const fieldIndex = this.fieldsToDisplayTable.findIndex((fld) => fld.value === fl.value);

        return { ...fl, ...this.fieldsToDisplayTable[fieldIndex] };
      }
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
    const isCustom = isEmpty(event.target.dataset.custom) ? undefined : event.target.dataset.custom === 'true';

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
      // set default variables in here
      objectToUpdate.flow = false;
      objectToUpdate.navigation = false;
      objectToUpdate.sendToCaller = false;

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

      // if it's a button
      objectToUpdate.isButton = CUSTOM_BUTTON_TYPES.includes(objectToUpdate.customType);

      // if it's a flow
      if (other.flow) {
        objectToUpdate.classesType = 'slds-size--1-of-1';
        objectToUpdate.flowOptions = this.flows.filter((fl) => fl.type === theValue);
      } else {
        if (other.sendToCaller || !objectToUpdate.isButton) {
          objectToUpdate.classesType = 'slds-size--10-of-12';
        }
      }
    }

    // check if it exists in the show as options and use that to populate the single/multiple and more
    let showAsOption;

    // if it's custom and not a button, it means it can only be displayed in the column
    const isCustomRecord = isEmpty(isCustom) ? this.selectedFields[fieldIndexSelected].isCustom : isCustom;
    const isButtonRecord = isEmpty(objectToUpdate.isButton)
      ? this.selectedFields[fieldIndexSelected].isButton
      : objectToUpdate.isButton;

    if (isCustomRecord && !isButtonRecord) {
      showAsOption = SHOW_AS_OPTIONS_CUSTOM_FIELDS;
      objectToUpdate.showAsOptions = [SHOW_AS_OPTIONS_CUSTOM_FIELDS];
    } else {
      showAsOption = [...SHOW_AS_OPTIONS_CUSTOM_BUTTONS, ...SHOW_AS_OPTIONS_FIELDS].find((sw) => sw.value === value);
      objectToUpdate.showAsOptions =
        isCustomRecord && isButtonRecord ? SHOW_AS_OPTIONS_CUSTOM_BUTTONS : SHOW_AS_OPTIONS_FIELDS;
    }

    if (showAsOption) {
      objectToUpdate.showAsSingle = showAsOption.single;
      objectToUpdate.showAsMultiple = showAsOption.multiple;
      objectToUpdate.showInBottomNav = showAsOption.bottomNav;
      objectToUpdate.icon = showAsOption.icon;
      objectToUpdate.column = showAsOption.column;

      if (showAsOption.icon) {
        objectToUpdate.iconVariant = ICON_VARIANTS[0];
      }

      if (showAsOption.bottomNav) {
        objectToUpdate.hidden = true;
      }
    }

    // if it's a hidden field
    if (
      (objectToUpdate.hidden && fieldName === 'hidden') ||
      (fieldName !== 'hidden' && this.selectedFields[fieldIndexSelected].hidden)
    ) {
      // check the hidden type
      objectToUpdate.hiddenIsRecordBased =
        (objectToUpdate.hiddenType || this.selectedFields[fieldIndexSelected].hiddenType) ===
        HIDDEN_TYPE_OPTIONS.RECORD.value;
    }

    this.selectedFields[fieldIndexSelected] = {
      ...this.selectedFields[fieldIndexSelected],
      ...objectToUpdate,
      ...other,
    };

    // fields to display table array
    const fieldIndex = this.fieldsToDisplayTable.findIndex((fl) => fl.value === fieldAPIName);

    // new object
    const newObject = { ...this.fieldsToDisplayTable[fieldIndex], ...objectToUpdate, ...other };
    newObject.canSummarize = !newObject.hidden && !newObject.isCustom;
    newObject.canHide = !newObject.summarize && !newObject.showInBottomNav;

    this.fieldsToDisplayTable[fieldIndex] = newObject;
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
        label: `${field.required && field.isEditable ? '* ' : ''}${field.tableLabel}`,
        tableLabel: field.tableLabel,
        order: field.order,
        fieldName: field.value,
        wrapText: true,
        hideDefaultActions: isEmpty(field.hideDefaultActions) ? true : field.hideDefaultActions,
        typeAttributes: {
          type: field.type,
          recordId: { fieldName: '_id' },
          record: { fieldName: '_originalRecord' },
          fieldName: field.value,
          isNew: { fieldName: 'isNew' },
          hasChanges: { fieldName: '_hasChanges' },
          isDeleted: { fieldName: 'isDeleted' },
          value: {
            fieldName: field.value,
          },
          config: {
            showAs: field.showAs,
            alignment: field.alignment || ALIGNMENT_OPTIONS.LEFT.value,
            hidden: field.hidden,
            hiddenConditionField: field.hiddenConditionField,
            hiddenType: field.hiddenType || HIDDEN_TYPE_OPTIONS.COLUMN.value,
            summarize: field.summarize,
            summarizeType: field.summarizeType,
          },
        },
      };

      // if we have custom header actions
      if (field.headerActions && JSON.parse(field.headerActions).length > 0) {
        const headerActions = JSON.parse(field.headerActions);
        const actionsToSave = [];

        if (field.isEditable) {
          actionsToSave.push(...headerActions.filter((ha) => ha.type === HEADER_ACTION_TYPES.SET_VALUE));
        }

        fieldToAdd.actions = actionsToSave;
      }

      // for object field columns
      if (field.isFieldColumn) {
        fieldToAdd = {
          ...fieldToAdd,
          type: INPUT_GENERIC_TYPE,
          typeAttributes: {
            ...fieldToAdd.typeAttributes,
            editable: field.isEditable,
            required: field.required,
            config: {
              ...fieldToAdd.typeAttributes.config,
              defaultValue: field.defaultValue,
              maxLength: field.maxLength,
              parentObjectName: field.parentObjectName,
              options: field.isLookup ? [] : field.options,
              scale: field.scale,
              precision: field.precision,
              isHTML: field.isHTML,
              isMulti: field.isMulti,
              lookupConfig: field.lookupConfig,
              column: field.column,
              icon: field.icon,
            },
          },
        };

        // if it's a tooltip icon column
        if (field.icon) {
          fieldToAdd.type = 'rowTooltipIconType';
          fieldToAdd.typeAttributes.config.iconName = field.iconName;
          fieldToAdd.typeAttributes.config.iconVariant = field.iconVariant;
          fieldToAdd.typeAttributes.config.label = fieldToAdd.label;

          // if it's not an slds icon, add a fixed initialWidth if empty
          if (!field.iconName.includes(':') && !field.initialWidth) {
            field.initialWidth = 60;
          }
        }
      } else {
        // custom columns
        fieldToAdd = {
          ...fieldToAdd,
          typeAttributes: {
            ...fieldToAdd.typeAttributes,
            label: field.tableLabel,
            config: {
              ...fieldToAdd.typeAttributes.config,
              isCustom: field.isCustom,
              customType: field.customType,
            },
          },
        };

        // for button types specifically
        if (CUSTOM_BUTTON_TYPES.includes(field.customType)) {
          fieldToAdd = {
            ...fieldToAdd,
            label: field.showInBottomNav ? field.tableLabel : '',
            type: ROW_BUTTON_TYPE,
            typeAttributes: {
              ...fieldToAdd.typeAttributes,
              name: field.flow
                ? ROW_BUTTON_CONFIGURATION.OPEN_FLOW.action
                : field.navigation
                  ? field.customType
                  : ROW_BUTTON_CONFIGURATION.SEND_TO_CALLER.action,
              config: {
                ...fieldToAdd.typeAttributes.config,
                flowName: field.flow ? field.flowName : undefined,
                flowInputVariables: field.flow ? field.flowInputVariables : undefined,
                flowNavigateNext: field.flow ? field.flowNavigateNext : undefined,
                waitForPlatformEvent: field.waitForPlatformEvent,
                showAsSingle: field.showAsSingle,
                showAsMultiple: field.showAsMultiple,
                showInBottomNav: field.showInBottomNav,
                bulkButtonLabel:
                  field.showAsMultiple && field.showAsSingle ? `Bulk ${field.tableLabel}` : field.tableLabel,
                hidden: !field.showAsSingle || field.hidden,
                buttonVariant: field.buttonVariant,
                isButtonIcon: field.isButtonIcon,
                iconName: field.iconName,
                buttonIconVariant: field.buttonIconVariant,
                tooltip: field.tooltip,
              },
            },
          };
        } else if (CUSTOM_FIELD_TYPES.includes(field.customType)) {
          const customFieldName = `custom_${field.tableLabel.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}`;

          fieldToAdd = {
            ...fieldToAdd,
            fieldName: customFieldName,
            type: INPUT_GENERIC_TYPE,
            typeAttributes: {
              ...fieldToAdd.typeAttributes,
              editable: true,
              type: field.customType,
              fieldName: customFieldName,
              value: {
                fieldName: customFieldName,
              },
              config: {
                ...fieldToAdd.typeAttributes.config,
                defaultValue: field.defaultValue,
                scale: field.scale,
                valueActive: field.valueActive,
                valueInactive: field.valueInactive,
                extraContainerClasses: field.extraContainerClasses || '',
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

    // add first and last column fields
    const first = result.find(
      (col) =>
        col.typeAttributes.config.column &&
        !col.typeAttributes.config.icon &&
        !col.typeAttributes.config.isCustom &&
        !col.typeAttributes.config.hidden,
    );
    first.typeAttributes.config.isFirstColumn = true;

    // Last element
    const last = result.findLast(
      (col) =>
        col.typeAttributes.config.column &&
        !col.typeAttributes.config.icon &&
        !col.typeAttributes.config.isCustom &&
        !col.typeAttributes.config.hidden,
    );
    last.typeAttributes.config.isLastColumn = true;

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
      value: generateRandomString(36, 2, 10),
      isEditable: false,
      required: false,
      canEdit: false,
      hidden: false,
      defaultValue: null,
    });

    this.handleSelectField({ detail: { value: fieldsPlusCustom } });
  }

  handleOpenFlowInputVariables(event) {
    this.flowFieldName = event.target.dataset.value;
    const configuration = this.selectedFields.find((fl) => fl.value === this.flowFieldName);
    this.flowInputs = configuration.flowInputVariables || null;
    this.flowSingle = configuration.showAsSingle || false;
    this.flowMultiple = configuration.showAsMultiple || false;
    this.flowBottomNav = configuration.showInBottomNav || false;
    this.showFlowInputVariables = true;
  }

  handleCloseFlowInputVariables() {
    this.flowInputs = null;
    this.flowFieldName = null;
    this.flowSingle = false;
    this.flowMultiple = false;
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

  handleOpenHeaderActions(event) {
    this.headerActionFieldName = event.target.dataset.value;
    const configuration = this.selectedFields.find((fl) => fl.value === this.headerActionFieldName);
    this.customHeaderActions = configuration.headerActions || null;
    this.hideDefaultHeaderActions = isEmpty(configuration.hideDefaultActions) ? true : configuration.hideDefaultActions;
    this.headerActionColumn = configuration;

    this.showHeaderActions = true;
  }

  handleCloseHeaderActions() {
    this.showHeaderActions = false;
  }

  handleSaveHeaderActions(event) {
    if (event && event.detail) {
      // update default hide actions
      this.handleUpdateField({
        target: {
          dataset: {
            value: this.headerActionFieldName,
          },
        },
        detail: {
          fieldName: 'hideDefaultActions',
          value: event.detail.hideDefaultActions,
        },
      });

      // update custom header actions
      if (event.detail.value) {
        this.handleUpdateField({
          target: {
            dataset: {
              value: this.headerActionFieldName,
            },
          },
          detail: {
            fieldName: 'headerActions',
            value: event.detail.value,
          },
        });
        this.handleCloseHeaderActions();
      }
    }
  }

  handleCopyFieldColumnsToClipboard() {
    const valueToCopy = [];

    this.fieldsToDisplayTable
      .filter((col) => col.isFieldColumn)
      .forEach((col) => {
        valueToCopy.push({
          digits: col.digits,
          isHTML: col.isHTML,
          isMasterDetail: col.isMasterDetail,
          label: col.label,
          tableLabel: col.label,
          maxLength: col.maxLength,
          precision: col.precision,
          scale: col.scale,
          type: col.type,
          isMulti: col.isMulti,
          isLookup: col.isLookup,
          canEdit: col.canEdit,
          options: col.options,
          required: col.required,
          fieldName: col.value,
          isEditable: col.isEditable,
          icon: col.icon,
          isButtonIcon: col.isButtonIcon,
          iconName: col.iconName,
          buttonIconVariant: col.buttonIconVariant,
          tooltip: col.tooltip,
          iconVariant: col.iconVariant,
          lookupConfig: col.lookupConfig,
          extraContainerClasses: col.extraContainerClasses,
          valueActive: col.valueActive,
          valueInactive: col.valueInactive,
          parentObjectName: col.parentObjectName,
          hidden: col.hidden,
          defaultValue: col.defaultValue,
          buttonVariant: col.buttonVariant,
        });
      });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(valueToCopy));
    } else {
      const input = document.createElement('textarea');
      input.innerHTML = valueToCopy;
      document.body.appendChild(input);
      input.select();

      // deprecated but still a good fallback because it is supported in most of the browsers
      document.execCommand('copy');

      document.body.removeChild(input);
    }

    // display a success toast
    Toast.show(
      {
        label: 'Copied!',
        message: 'The Field Columns Configuration was copied to your clipboard',
        mode: 'dismissible',
        variant: 'success',
      },
      this,
    );
  }
}
