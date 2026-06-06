/**
 * Project access chain:
 * employee_master.emp_role -> project_role_master.id
 * project_permission_master.role_ids[] contains project_role_master.id
 * project_permission_master.project_ids[] -> assigned projects for that role
 */

/** employee emp_role (project_role_master.id) is listed in permission role_ids */
const EMPLOYEE_ROLE_IN_PERMISSION = `
  EXISTS (
    SELECT 1
    FROM project_permission_master ppm
    INNER JOIN project_role_master prm_scope ON prm_scope.id = em.emp_role
    WHERE prm_scope.id = ANY(COALESCE(ppm.role_ids, '{}'::int[]))
      AND ppm.overall_access = false
  )
`;

/** Same as above + project filter for portal scope */
const employeeRoleHasProject = (projectParamRef) => `
  EXISTS (
    SELECT 1
    FROM project_permission_master ppm
    INNER JOIN project_role_master prm_scope ON prm_scope.id = em.emp_role
    WHERE prm_scope.id = ANY(COALESCE(ppm.role_ids, '{}'::int[]))
      AND ppm.overall_access = false
      AND ${projectParamRef} = ANY(COALESCE(ppm.project_ids, '{}'::int[]))
  )
`;

/** LATERAL subquery body: projects derived from project_role_master + permission */
const EMPLOYEE_PROJECTS_LATERAL_SELECT = `
  SELECT
    COALESCE(array_agg(DISTINCT pid ORDER BY pid), '{}'::int[]) AS project_ids,
    COALESCE(string_agg(DISTINCT pm2.name, ', ' ORDER BY pm2.name), '') AS project_name,
    MIN(pid) AS project_id
  FROM project_permission_master ppm
  INNER JOIN project_role_master prm_scope ON prm_scope.id = em.emp_role
  CROSS JOIN LATERAL unnest(COALESCE(ppm.project_ids, '{}'::int[])) AS pid
  LEFT JOIN project_master pm2 ON pm2.id = pid
  WHERE prm_scope.id = ANY(COALESCE(ppm.role_ids, '{}'::int[]))
    AND ppm.overall_access = false
    AND cardinality(COALESCE(ppm.project_ids, '{}'::int[])) > 0
`;

module.exports = {
  EMPLOYEE_ROLE_IN_PERMISSION,
  employeeRoleHasProject,
  EMPLOYEE_PROJECTS_LATERAL_SELECT,
};
