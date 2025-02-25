/*************************************************************************************************************
 * @name			OD_Datatable
 * @author			Pablo Martinez <pablo@farmcove.co.uk>
 * @created			26 / 01 / 2025
 * @description		Class to host all the wrappers used by other classes
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2025-01-26		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public class OD_Datatable {
  public class ConfigurationWrapper {
    @AuraEnabled
    public List<RecordWrapper> objects;

    @AuraEnabled
    public List<RecordWrapper> flows;

    public ConfigurationWrapper() {
      this.objects = new List<RecordWrapper>();
      this.flows = new List<RecordWrapper>();
    }
  }

  public class RecordWrapper {
    @AuraEnabled
    public String label;

    @AuraEnabled
    public String value;

    @AuraEnabled
    public String type;

    public RecordWrapper(String value, String label) {
      this.label = label;
      this.value = value;
      this.type = null;
    }

    public RecordWrapper(String value, String label, String type) {
      this.label = label;
      this.value = value;
      this.type = type;
    }
  }

  public class FieldWrapper implements Comparable {
    @AuraEnabled
    public String value;

    @AuraEnabled
    public String label;

    @AuraEnabled
    public String type;

    @AuraEnabled
    public Boolean canEdit;

    @AuraEnabled
    public Boolean required;

    @AuraEnabled
    public Integer maxLength;

    @AuraEnabled
    public Integer precision;

    @AuraEnabled
    public Integer scale;

    @AuraEnabled
    public Integer digits;

    @AuraEnabled
    public Boolean isHTML;

    @AuraEnabled
    public Object defaultValue;

    @AuraEnabled
    public String parentObjectName;

    @AuraEnabled
    public String parentObjectLabel;

    @AuraEnabled
    public Boolean canBeUsedInWhere;

    @AuraEnabled
    public Boolean isMasterDetail;

    @AuraEnabled
    public List<PicklistOption> options;

    @AuraEnabled
    public String helpText;

    public FieldWrapper() {
      this.options = new List<PicklistOption>();
    }

    public Integer compareTo(Object compareTo) {
      FieldWrapper curField = (FieldWrapper) compareTo;

      if (label == curField.label) {
        return 0;
      }
      if (label > curField.label) {
        return 1;
      }
      return -1;
    }
  }

  public class PicklistOption {
    @AuraEnabled
    public String value;

    @AuraEnabled
    public String label;

    public PicklistOption(String value, String label) {
      this.value = value;
      this.label = label;
    }
  }

  public class SaveResultWrapper {
    @AuraEnabled
    public Boolean success;

    @AuraEnabled
    public List<SObject> records;

    @AuraEnabled
    public SaveErrorsWrapper errors;

    public SaveResultWrapper() {
      this.success = true;
      this.records = new List<SObject>();
      this.errors = new SaveErrorsWrapper();
    }
  }

  public class SaveErrorsWrapper {
    @AuraEnabled
    public List<SaveErrorWrapper> insertErrors;

    @AuraEnabled
    public List<SaveErrorWrapper> updateErrors;

    @AuraEnabled
    public List<SaveErrorWrapper> deleteErrors;

    public SaveErrorsWrapper() {
      this.insertErrors = new List<SaveErrorWrapper>();
      this.updateErrors = new List<SaveErrorWrapper>();
      this.deleteErrors = new List<SaveErrorWrapper>();
    }
  }

  public class FieldErrorWrapper {
    @AuraEnabled
    public String fieldName;

    @AuraEnabled
    public String message;

    @AuraEnabled
    public String statusCode;

    public FieldErrorWrapper(String fieldName, String message, String statusCode) {
      this.fieldName = fieldName;
      this.message = message;
      this.statusCode = statusCode;
    }
  }

  public class SaveErrorWrapper {
    @AuraEnabled
    public String recordId;

    @AuraEnabled
    public String message;

    @AuraEnabled
    public List<FieldErrorWrapper> fieldErrors;

    public SaveErrorWrapper(String recordId, String message, List<Database.Error> errors) {
      this.recordId = recordId;
      this.message = message;
      this.fieldErrors = new List<FieldErrorWrapper>();

      List<String> generalErrorMessages = new List<String>();

      if (errors != null) {
        for (Database.Error error : errors) {
          List<String> fields = error.getFields();

          if (fields.isEmpty()) {
            // This is a general error (not tied to a specific field)
            generalErrorMessages.add(error.getMessage());
          } else {
            // This is a field-specific error
            for (String field : fields) {
              this.fieldErrors.add(
                new FieldErrorWrapper(field, error.getMessage(), String.valueOf(error.getStatusCode()))
              );
            }
          }
        }
      }

      // Concatenate general error messages if any exist
      if (!generalErrorMessages.isEmpty()) {
        this.message = String.join(generalErrorMessages, '. ');
      }
    }
  }
}