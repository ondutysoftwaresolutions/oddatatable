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
}