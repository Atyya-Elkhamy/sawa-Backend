import { ComponentLoader } from 'adminjs';

const componentLoader = new ComponentLoader();

const Components = {
  FileUploadComponent: componentLoader.add('FileUploadComponent', './FileUploadComponent.jsx'),
  CustomUploadShowComponent: componentLoader.add('CustomUploadShowComponent', './UploadShowComponent.jsx'),
  Dashboard: componentLoader.add('Dashboard', './DashboardComponent.jsx'),
  CustomArrayShowComponent: componentLoader.add('CustomArrayShowComponent', './CustomArrayShowComponent.jsx'),
  GiftArrayComponent: componentLoader.add('GiftArrayComponent', './GiftArrayComponent.jsx'),
  ItemArrayComponent: componentLoader.add('ItemArrayComponent', './ItemArrayComponent.jsx'),
  BroadcastForm: componentLoader.add('BroadcastForm', './broadcast-form.jsx'),
  BroadCastPage: componentLoader.add('BroadCastPage', '../../pages/broadcast-page.jsx'),
  ChatMessagesDisplay: componentLoader.add('ChatMessagesDisplay', './ChatMessagesDisplay.jsx'),
  ParticipantsDisplay: componentLoader.add('ParticipantsDisplay', './ParticipantsDisplay.jsx'),
  SalaryDisplay: componentLoader.add('SalaryDisplay', './SalaryDisplay.jsx'),
  AgencyStatisticsDisplay: componentLoader.add('AgencyStatisticsDisplay', './AgencyStatisticsDisplay.jsx'),
  HostStatisticsDisplay: componentLoader.add('HostStatisticsDisplay', './HostStatisticsDisplay.jsx'),
  DiamondDisplay: componentLoader.add('DiamondDisplay', './DiamondDisplay.jsx'),
  PerformanceSummary: componentLoader.add('PerformanceSummary', './PerformanceSummary.jsx'),
  HostPerformanceSummary: componentLoader.add('HostPerformanceSummary', './HostPerformanceSummary.jsx'),
  RoleBasedEdit: componentLoader.add('RoleBasedEdit', './RoleBasedEditComponent.jsx'),
};

export { componentLoader, Components };
