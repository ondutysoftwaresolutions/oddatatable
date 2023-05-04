@IsTest
public class OD_ConfigurationEditorControllerTest {
  @TestSetup
  static void setup() {
    Account acc = new Account(Name = 'Test');
    insert acc;

    Contact con = new Contact(LastName = 'Test', AccountId = acc.Id);
    insert con;

    Contact con2 = new Contact(LastName = 'LastName', AccountId = acc.Id);
    insert con2;

    Case theCase = new Case();
    insert theCase;
  }

  @IsTest
  static void testGetObjectsSuccess() {
    Test.startTest();

    List<OD_ConfigurationEditorController.ObjectWrapper> result = OD_ConfigurationEditorController.getObjects();

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\' find any object');
  }

  @IsTest
  static void testGetFieldsForObjectSuccess() {
    Test.startTest();

    List<OD_ConfigurationEditorController.FieldWrapper> result = OD_ConfigurationEditorController.getFieldsForObject(
      'Account'
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\' find any field for the Account object');
  }

  @IsTest
  static void testGetFieldsForObjectFail() {
    Test.startTest();

    try {
      List<OD_ConfigurationEditorController.FieldWrapper> result = OD_ConfigurationEditorController.getFieldsForObject(
        null
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the fields for the Object: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetRecordsForLookupSuccess() {
    Contact con = [SELECT Id, LastName FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getRecordsForLookup(
      'Contact',
      'test'
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\' find any lookup record');
    Assert.areEqual(result[0].label, con.LastName, 'Wrong label found');
  }

  @IsTest
  static void testGetRecordsForLookupFail() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    try {
      List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getRecordsForLookup(
        null,
        't'
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the records for the Object: null and the text: t.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetLookupRecordSuccess() {
    Contact con = [SELECT Id, LastName FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
      'Contact',
      con.Id
    );

    Test.stopTest();

    Assert.areEqual(result.label, con.LastName, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordCaseSuccess() {
    Case theCase = [SELECT Id, CaseNumber FROM Case LIMIT 1];
    Test.startTest();

    OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
      'Case',
      theCase.Id
    );

    Test.stopTest();

    Assert.areEqual(result.label, theCase.CaseNumber, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordFail() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    try {
      OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
        'Contact',
        null
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the record for the Object: Contact and the Id: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }
}