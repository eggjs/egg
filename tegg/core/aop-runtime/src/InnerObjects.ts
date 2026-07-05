// Re-exported so the module scan picks CrosscutAdviceFactory up as a member
// of this module — it is decorated @InnerObjectProto in @eggjs/aop-decorator,
// but the scan only collects classes exported from this package's files.
export { CrosscutAdviceFactory } from '@eggjs/aop-decorator';
