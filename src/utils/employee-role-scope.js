/**
 * Portal project scope via Role Master:
 * employee_master.role_master_id -> roles_master.id
 * roles_master.project_ids[] -> project assignment for list/edit in portal
 */

const employeeRoleMasterHasProject = (projectParamRef) => `
  EXISTS (
    SELECT 1
    FROM roles_master rm_scope
    WHERE rm_scope.id = em.role_master_id
      AND ${projectParamRef} = ANY(COALESCE(rm_scope.project_ids, '{}'::int[]))
  )
`;

module.exports = {
  employeeRoleMasterHasProject,
};
