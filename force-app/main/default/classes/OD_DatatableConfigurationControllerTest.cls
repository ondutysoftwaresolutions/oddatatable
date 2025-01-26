@IsTest
public class OD_DatatableConfigurationControllerTest {
  @IsTest
  static void testGetConfigurationSuccess() {
    Test.startTest();

    OD_Datatable.ConfigurationWrapper result = OD_DatatableConfigurationController.getConfiguration();

    Test.stopTest();

    Assert.isTrue(result.objects.size() > 0, 'We couldn\'t find any object');
    Assert.isTrue(result.flows.size() > 0, 'We couldn\'t find any screen flow');
  }

  @IsTest
  static void testGetFieldsForObjectSuccess() {
    Test.startTest();

    List<OD_Datatable.FieldWrapper> result = OD_DatatableConfigurationController.getFieldsForObject('Account');

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\'t find any field for the Account object');
  }

  @IsTest
  static void testGetFieldsForObjectFail() {
    Test.startTest();

    try {
      List<OD_Datatable.FieldWrapper> result = OD_DatatableConfigurationController.getFieldsForObject(null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the fields for the Object: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectSuccessFound() {
    Test.startTest();

    List<OD_Datatable.PicklistOption> result = OD_DatatableConfigurationController.getMasterDetailFieldsForObject(
      'OpportunityLineItem'
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 1, 'We couldn\'t find any field for the OpportunityLineItem object');
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectSuccessNotFound() {
    Test.startTest();

    List<OD_Datatable.PicklistOption> result = OD_DatatableConfigurationController.getMasterDetailFieldsForObject(
      'Account'
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 0, 'We could find at least one field for the Account object');
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectFail() {
    Test.startTest();

    try {
      List<OD_Datatable.PicklistOption> result = OD_DatatableConfigurationController.getMasterDetailFieldsForObject(
        'OpportunityProduct'
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the master detail fields for the Object: OpportunityProduct'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetConfigurationRelatedListSuccess() {
    Test.startTest();

    String tableConfiguration = OD_DatatableConfigurationController.getConfigurationRelatedList('Test');

    Test.stopTest();

    Assert.isNotNull(tableConfiguration, 'There is not a table configuration string for that custom metadata');
  }

  @IsTest
  static void testGetConfigurationRelatedListFail() {
    Test.startTest();

    try {
      String tableConfiguration = OD_DatatableConfigurationController.getConfigurationRelatedList('Test1');
    } catch (Exception e) {
      Assert.isTrue(
        e.getMessage()
          .contains(
            'There is no custom metadata record in the OD_Datatable_JSON_Configuration__mdt with the name Test1. Please add the record or change the name in the component.'
          ),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }
}