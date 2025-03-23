import DELETE_BUTTON_TOOLTIP from '@salesforce/label/c.Delete_Button_Tooltip';
import RESTORE_BUTTON_TOOLTIP from '@salesforce/label/c.Restore_Button_Tooltip';

export const FIELD_TYPES = {
  ADDRESS: 'address',
  CHECKBOX: 'boolean',
  CURRENCY: 'currency',
  DATE: 'date',
  DATETIME: 'datetime',
  DOUBLE: 'double',
  EMAIL: 'email',
  ID: 'id',
  INTEGER: 'integer',
  LONG: 'long',
  LONG_TEXTAREA: 'long_textarea',
  LOOKUP: 'lookup',
  MULTISELECT: 'multipicklist',
  PERCENTAGE: 'percent',
  PHONE: 'phone',
  RADIO_BUTTON_TYPE: 'radioButtonType',
  RICH_TEXTAREA: 'rich_textarea',
  SEARCH: 'search',
  SELECT: 'picklist',
  STRING: 'string',
  TEXT: 'text',
  TEXTAREA: 'textarea',
  TOGGLE: 'toggle',
  URL: 'url',
  CUSTOM: 'custom',
};

export const TEXT_FIELDS = [
  FIELD_TYPES.ADDRESS,
  FIELD_TYPES.EMAIL,
  FIELD_TYPES.PHONE,
  FIELD_TYPES.STRING,
  FIELD_TYPES.TEXT,
  FIELD_TYPES.URL,
];

export const NUMERIC_FIELDS = [FIELD_TYPES.DOUBLE, FIELD_TYPES.INTEGER, FIELD_TYPES.LONG];

export const DATE_FIELDS = [FIELD_TYPES.DATE, FIELD_TYPES.DATETIME];

const ALL_NUMERIC_FIELDS = [...NUMERIC_FIELDS, FIELD_TYPES.PERCENTAGE, FIELD_TYPES.CURRENCY];

export const FORMATTED_FIELDS = [...DATE_FIELDS, FIELD_TYPES.CURRENCY, FIELD_TYPES.PERCENTAGE];

export const TEXTAREA_FIELDS = [FIELD_TYPES.LONG_TEXTAREA, FIELD_TYPES.RICH_TEXTAREA, FIELD_TYPES.TEXTAREA];

export const LOCAL_SIDE_SEARCH = [FIELD_TYPES.SELECT, FIELD_TYPES.MULTISELECT];

export const SERVER_SIDE_SEARCH = [FIELD_TYPES.LOOKUP];

export const FIELDS_STRING = [...TEXT_FIELDS, ...LOCAL_SIDE_SEARCH, ...SERVER_SIDE_SEARCH];

export const AVAILABLE_FIELDS_GROUPING = [
  ...TEXT_FIELDS,
  FIELD_TYPES.SELECT,
  ...ALL_NUMERIC_FIELDS,
  ...DATE_FIELDS,
  FIELD_TYPES.TEXTAREA,
];

export const CUSTOM_TYPES = {
  SCREEN_FLOW: 'Flow',
  AUTOLAUNCHED_FLOW: 'AutoLaunchedFlow',
  NAVIGATE_NEXT: 'Next',
  NAVIGATE_BACK: 'Back',
  SEND_TO_CALLER: 'sendToCaller',
};

export const CUSTOM_BUTTON_TYPES = [
  CUSTOM_TYPES.SCREEN_FLOW,
  CUSTOM_TYPES.AUTOLAUNCHED_FLOW,
  CUSTOM_TYPES.NAVIGATE_NEXT,
  CUSTOM_TYPES.NAVIGATE_BACK,
  CUSTOM_TYPES.SEND_TO_CALLER,
];

export const CUSTOM_FIELD_TYPES = [
  FIELD_TYPES.CHECKBOX,
  FIELD_TYPES.CURRENCY,
  FIELD_TYPES.DATE,
  FIELD_TYPES.LONG,
  FIELD_TYPES.PERCENTAGE,
  FIELD_TYPES.TEXT,
  FIELD_TYPES.TOGGLE,
];

export const FORMATTED_TYPE_TO_SHOW = {
  address: {
    label: 'Address',
  },
  boolean: {
    label: 'Checkbox',
  },
  currency: {
    label: 'Currency',
    precision: true,
  },
  date: {
    label: 'Date',
  },
  datetime: {
    label: 'Date/Time',
  },
  double: {
    label: 'Number',
    precision: true,
  },
  email: {
    label: 'Email',
  },
  id: {
    label: 'Id',
  },
  integer: {
    label: 'Integer',
    digits: true,
  },
  long: {
    label: 'Number',
    precision: true,
  },
  long_textarea: {
    label: 'Long Text Area',
    maxLength: true,
  },
  lookup: {
    label: 'Lookup',
    object: true,
  },
  multipicklist: {
    label: 'Picklist (Multi-Select)',
  },
  percent: {
    label: 'Percent',
    precision: true,
  },
  phone: {
    label: 'Phone',
  },
  rich_textarea: {
    label: 'Rich Text Area',
    maxLength: true,
  },
  picklist: {
    label: 'Picklist',
  },
  string: {
    label: 'Text',
    maxLength: true,
  },
  text: {
    label: 'Text',
    maxLength: true,
  },
  textarea: {
    label: 'Text Area',
    maxLength: true,
  },
  url: {
    label: 'URL',
    maxLength: true,
  },
  custom: {
    label: '',
    options: [
      {
        value: CUSTOM_TYPES.SCREEN_FLOW,
        label: 'Screen Flow',
        flow: true,
      },
      {
        value: CUSTOM_TYPES.AUTOLAUNCHED_FLOW,
        label: 'Autolaunched Flow',
        flow: true,
      },
      {
        value: CUSTOM_TYPES.NAVIGATE_NEXT,
        label: 'Navigate Next',
        navigation: true,
      },
      {
        value: CUSTOM_TYPES.NAVIGATE_BACK,
        label: 'Navigate Back',
        navigation: true,
      },
      {
        value: CUSTOM_TYPES.SEND_TO_CALLER,
        label: 'Send To Caller',
        sendToCaller: true,
      },
      {
        value: FIELD_TYPES.CHECKBOX,
        label: 'Checkbox Field',
        extraContainerClasses: 'slds-align--absolute-center',
      },
      {
        value: FIELD_TYPES.CURRENCY,
        label: 'Currency Field',
        scale: 2,
      },
      {
        value: FIELD_TYPES.DATE,
        label: 'Date Field',
      },
      {
        value: FIELD_TYPES.LONG,
        label: 'Number Field',
      },
      {
        value: FIELD_TYPES.PERCENTAGE,
        label: 'Percentage Field',
        scale: 2,
      },
      {
        value: FIELD_TYPES.TEXT,
        label: 'Text Field',
      },
      {
        value: FIELD_TYPES.TOGGLE,
        label: 'Toggle Field',
        valueActive: ' ',
        valueInactive: ' ',
        extraContainerClasses: 'slds-align--absolute-center',
      },
    ],
  },
};

export const YES_NO = {
  YES: 'Yes',
  NO: 'No',
};

export const INLINE_FLOW = {
  INLINE: 'Inline',
  FLOW: 'Flow',
};

export const EMPTY_STRING = '--empty--';

export const EVENTS = {
  ADD: 'add',
  CHANGE: 'change',
  GROUP_COLLAPSE: 'groupCollapse',
  GROUP_EXPAND: 'groupExpand',
  OPEN_FLOW: 'openFlow',
  NAVIGATE_BACK: CUSTOM_TYPES.NAVIGATE_BACK,
  NAVIGATE_NEXT: CUSTOM_TYPES.NAVIGATE_NEXT,
  SEND_TO_CALLER: CUSTOM_TYPES.SEND_TO_CALLER,
  DELETE: 'delete',
  UNDELETE: 'undelete',
};

export const ROW_BUTTON_TYPE = 'rowButtonType';

export const ROW_BUTTON_CONFIGURATION = {
  SEND_TO_CALLER: {
    action: EVENTS.SEND_TO_CALLER,
  },
  OPEN_FLOW: {
    action: EVENTS.OPEN_FLOW,
  },
  EDIT: {
    _editAction: EVENTS.CHANGE,
  },
  DELETE: {
    iconName: 'utility:delete',
    _deleteAction: EVENTS.DELETE,
    tooltip: DELETE_BUTTON_TOOLTIP,
  },
  UNDELETE: {
    iconName: 'utility:undelete',
    _deleteAction: EVENTS.UNDELETE,
    tooltip: RESTORE_BUTTON_TOOLTIP,
  },
  GROUP_COLLAPSE: {
    buttonVariant: 'base',
    iconName: 'utility:chevronup',
    action: EVENTS.GROUP_COLLAPSE,
  },
  GROUP_EXPAND: {
    buttonVariant: 'base',
    iconName: 'utility:chevrondown',
    action: EVENTS.GROUP_EXPAND,
  },
};

export const FLOW_DATA_TYPES = [
  {
    value: 'String',
    label: 'Text',
  },
  {
    value: 'Number',
    label: 'Number',
  },
  {
    value: 'Boolean',
    label: 'Boolean',
  },
];

export const SHOW_AS_OPTIONS_FIELDS = [
  {
    label: 'Field Value',
    value: 'column',
    column: true,
    default: true,
    single: true,
  },
  {
    label: 'Tooltip Icon',
    value: 'tooltipIcon',
    icon: true,
  },
];

export const SHOW_AS_OPTIONS_CUSTOM_BUTTONS = [
  {
    label: 'Column',
    value: 'column',
    column: true,
    default: true,
    single: true,
  },
  {
    label: 'Bulk Button',
    value: 'bulk',
    multiple: true,
  },
  {
    label: 'Column and Bulk Button',
    value: 'both',
    column: true,
    multiple: true,
    single: true,
  },
  {
    label: 'Bottom Navigation',
    value: 'bottomNav',
    bottomNav: true,
  },
];

export const SHOW_AS_OPTIONS_CUSTOM_FIELDS = {
  label: 'Column',
  value: 'column',
  column: true,
  default: true,
  single: true,
};

export const ICON_VARIANTS = [
  {
    label: 'Bare',
    value: 'bare',
  },
  {
    label: 'Error',
    value: 'error',
  },
  {
    label: 'Inverse',
    value: 'inverse',
  },
  {
    label: 'Warning',
    value: 'warning',
  },
];

export const BUTTON_VARIANTS = [
  {
    label: 'Base',
    value: 'base',
  },
  {
    label: 'Brand',
    value: 'brand',
  },
  {
    label: 'Brand Outline',
    value: 'brand-outline',
  },
  {
    label: 'Destructive',
    value: 'destructive',
  },
  {
    label: 'Destructive Text',
    value: 'destructive-text',
  },
  {
    label: 'Inverse',
    value: 'inverse',
  },
  {
    label: 'Neutral',
    value: 'neutral',
    default: true,
  },
  {
    label: 'Success',
    value: 'success',
  },
];

export const BUTTON_ICON_VARIANTS = [
  {
    label: 'Bare',
    value: 'bare',
  },
  {
    label: 'Container',
    value: 'container',
  },
  {
    label: 'Brand',
    value: 'brand',
  },
  {
    label: 'Border',
    value: 'border',
  },
  {
    label: 'Border Filled',
    value: 'border-filled',
  },
  {
    label: 'Bare Inverse',
    value: 'bare-inverse',
  },
  {
    label: 'Border Inverse',
    value: 'border-inverse',
  },
];

export const ALIGNMENT_OPTIONS = {
  LEFT: {
    label: 'Left',
    value: 'left',
  },
  CENTER: {
    label: 'Center',
    value: 'center',
  },
  RIGHT: {
    label: 'Right',
    value: 'right',
  },
};

export const HIDDEN_TYPE_OPTIONS = {
  COLUMN: {
    label: 'Entire Column',
    value: 'column',
  },
  RECORD: {
    label: 'Record Based',
    value: 'record',
  },
};

export const PLATFORM_EVENT_CHANNEL_NAME = '/event/OD_Refresh_Datatable__e';

export const INPUT_GENERIC_TYPE = 'inputGeneric';

export const SUMMARIZE_OPTIONS = [
  {
    label: 'AVG',
    value: 'avg',
    types: ALL_NUMERIC_FIELDS,
  },
  {
    label: 'COUNT',
    value: 'count',
    all: true,
  },
  {
    label: 'MAX',
    value: 'max',
    types: [...ALL_NUMERIC_FIELDS, ...DATE_FIELDS],
  },
  {
    label: 'MIN',
    value: 'min',
    types: [...ALL_NUMERIC_FIELDS, ...DATE_FIELDS],
  },
  {
    label: 'SUM',
    value: 'sum',
    types: ALL_NUMERIC_FIELDS,
  },
];

export const SORT_DIRECTION = {
  ASC: {
    label: 'ASC',
    value: 'asc',
  },
  DESC: {
    label: 'DESC',
    value: 'desc',
  },
};

export const GROUPING_SOURCE = {
  FIELD: 'Field',
  DATASET: 'Dataset',
};

export const SELECTION_TYPES = {
  SINGLE: 'Single Row',
  MULTIPLE: 'Multiple Rows',
};

export const HEADER_ACTION_TYPES = {
  SET_VALUE: 'setValue',
};

export const SHARING_CONTEXT = {
  WITH_SHARING: 'With Sharing',
  WITHOUT_SHARING: 'Without Sharing',
};
