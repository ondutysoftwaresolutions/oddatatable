# Saving

![Saving](./preview.png)

**Save Enabled**: If enabled, a Save and Cancel buttons will appear in the table to be able to save the changes.
**Save Label**: Label to show in the Save button if save is enabled.
**Navigate Next after Save?**: If enabled, after clicking Save it will execute the Next button navigation of the screen and it will output the variable 'saveAndNext' = true. This only works in Flows.

## Errors From Saving

When errors occur during the save process (for new, updated, or deleted records), the component provides comprehensive error feedback:

- A generic error message appears at the top of the component alerting users to review highlighted errors.
- Error handling is field-specific where possible:

  - Fields with validation errors are highlighted in red
  - Hovering over these fields displays the specific error message
  - If multiple validation rules fail for the same field, all error messages are concatenated

- For errors without associated fields (general errors):

  - All general error messages are concatenated with periods between them
  - These concatenated messages are displayed when hovering over any editable field in the affected row
  - This ensures users see all error messages, even those not tied to specific fields

- The component intelligently combines field-specific and general errors:
  - If a row has both field-specific errors and general errors, the general error messages are appended to each field's error tooltip
  - This provides complete error context when hovering over any highlighted field

This comprehensive approach ensures users have access to all error information needed to correct their data before attempting to save again.
