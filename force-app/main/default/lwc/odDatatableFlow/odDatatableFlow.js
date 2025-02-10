import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { getFieldsFromString, doReplaceMergeField } from 'c/odDatatableUtils';

export default class OdDatatableFlow extends LightningModal {
  @api flowName;
  @api inputVariables = [];
  @api bottomNavFlow = false;
  @api currentRecord;
  @api preview = false;

  errorMessage = false;

  get inputVariablesToUse() {
    const result = [];

    this.inputVariables.forEach((iv) => {
      let valueToUse = iv.value || iv.fixedValue;
      // if the value contains a reference to current record, replace it here ({{Name}})
      if (valueToUse.includes('{{') && this.currentRecord) {
        const fieldsToReplace = getFieldsFromString(valueToUse);

        // for each record field, start the replace
        fieldsToReplace.forEach((fl) => {
          valueToUse = doReplaceMergeField(valueToUse, fl, this.currentRecord);
        });
      }

      result.push({
        name: iv.name,
        type: iv.type,
        value: valueToUse,
      });
    });

    return result;
  }

  handleStatusChange(event) {
    if (event.detail.status === 'FINISHED' || event.detail.status === 'FINISHED_SCREEN') {
      if (event.detail.outputVariables) {
        const recordOutput = event.detail.outputVariables.find(
          (output) => output.dataType === 'SOBJECT' && output.name === 'recordOutput',
        );

        const recordsOutput = event.detail.outputVariables.find(
          (output) => output.dataType === 'SOBJECT' && output.name === 'recordsOutput',
        );

        if (
          (!recordOutput || (recordOutput && !recordOutput.value)) &&
          (!recordsOutput || (recordsOutput && !recordsOutput.value))
        ) {
          this.close({ isSuccess: true });
        } else {
          this.errorMessage = false;
          this.close({
            isSuccess: true,
            bottomNavFlow: this.bottomNavFlow,
            flowOutput: (recordOutput && recordOutput.value) || (recordsOutput && recordsOutput.value),
          });
        }
      } else {
        this.close({ isSuccess: true });
      }
    }
  }

  handleClose() {
    this.close();
  }
}
