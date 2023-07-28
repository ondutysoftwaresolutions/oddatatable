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

      if (!recordOutput) {
        this.errorMessage = "The flow needs to return a SObject Record variable named 'recordOutput'";
      } else {
        this.errorMessage = false;
        this.close(recordOutput.value);
      }
    }
  }
}
