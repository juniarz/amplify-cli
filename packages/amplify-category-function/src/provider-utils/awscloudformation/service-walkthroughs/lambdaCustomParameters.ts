import _ from 'lodash';
import { FunctionParameters, FunctionDependency } from 'amplify-function-plugin-interface/src';

export const lambdaCustomParameters = async (
  context,
  functionParameters: Partial<FunctionParameters>,
  currentParameters?
): Promise<LambdaCustomParametersResponse> => {
  let categoryPolicies = functionParameters.categoryPolicies || [];
  const customPolicies = currentParameters?.customPermissions?.policies;
  if (customPolicies && Array.isArray(customPolicies)) {
    context.print.info(`Custom policies found, adding to existing list.`);

    categoryPolicies = categoryPolicies.concat(customPolicies);
  }

  let environmentMap = functionParameters.environmentMap || {};
  const customEnvironmentMap = currentParameters?.customPermissions?.environmentVariables;
  if (customEnvironmentMap) {
    context.print.info(`Custom environment variables found, adding to existing.`);

    environmentMap = customEnvironmentMap;
  }

  const dependsOn: FunctionDependency[] = functionParameters.dependsOn || [];
  const customDependencies = currentParameters?.customPermissions?.dependencies;

  if (customDependencies) {
    context.print.info(`Custom dependencies found, adding to existing list.`);

    for (const dependency of customDependencies) {
      const _dependsOnIndex = dependsOn.findIndex((_dependant) => _dependant.category === dependency.category && _dependant.resourceName === dependency.resourceName);
      const _dependsOn = dependsOn[_dependsOnIndex];

      let attributes = [];
      if (_dependsOn) {
        attributes = [...new Set(_dependsOn.attributes.concat(dependency.attributes))];

        dependsOn[_dependsOnIndex] = _dependsOn;
      } else {
        dependsOn.push(dependency);

        attributes = [...new Set(dependency.attributes)];
      }

      const category = dependency.category;
      const resourceName = dependency.resourceName;
      attributes.forEach(attribute => {
        const envName = `${category.toUpperCase()}_${resourceName.toUpperCase()}_${attribute.toUpperCase()}`;
        console.log(envName);
        const refName = `${category}${resourceName}${attribute}`;
        environmentMap[envName] = { Ref: refName };
      });
    }
  }

  return {
    dependsOn,
    environmentMap,
    categoryPolicies,
  };
};

export type LambdaCustomParametersResponse = Required<
  Pick<FunctionParameters, 'categoryPolicies' | 'environmentMap' | 'dependsOn'>
>;
