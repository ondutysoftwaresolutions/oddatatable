import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class OdDatatableFlow extends LightningModal {
  @api flowName;
  @api inputVariables = [];

  errorMessage = false;

  handleStatusChange(event) {
    if (event.detail.status === 'FINISHED' || event.detail.status === 'FINISHED_SCREEN') {
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
          flowOutput: (recordOutput && recordOutput.value) || (recordsOutput && recordsOutput.value),
        });
      }
    }
  }
}
