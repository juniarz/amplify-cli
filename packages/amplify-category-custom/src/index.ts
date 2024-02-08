import { $TSAny, $TSContext, AmplifyError, IAmplifyResource, stateManager } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import * as path from 'path';
import { buildCustomResources } from './utils/build-custom-resources';
import { categoryName } from './utils/constants';

export { generateDependentResourcesType } from './utils/build-custom-resources';
export { addCDKResourceDependency } from './utils/dependency-management-utils';
export { AmplifyResourceProps } from './utils/generate-cfn-from-cdk';

/**
 * execute amplify command
 */
export const executeAmplifyCommand = async (context: $TSContext): Promise<void> => {
  let commandPath = path.normalize(path.join(__dirname, 'commands'));

  if (context.input.command === 'help') {
    commandPath = path.join(commandPath, categoryName);
  } else {
    commandPath = path.join(commandPath, categoryName, context.input.command);
  }

  const commandModule = await import(commandPath);

  // Check if project has been initialized
  if (!stateManager.metaFileExists()) {
    throw new AmplifyError('MissingAmplifyMetaFileError', {
      message: 'Could not find the amplify-meta.json file.',
      resolution: 'Make sure your project is initialized in the cloud.',
    });
  }

  await commandModule.run(context);
};

/**
 * Amplify event handler
 */
export const handleAmplifyEvent = async (__context: $TSContext, args: $TSAny): Promise<void> => {
  printer.info(`${categoryName} handleAmplifyEvent to be implemented`);
  printer.info(`Received event args ${args}`);
};

/**
 * Transform category stack
 */
export const transformCategoryStack = async (context: $TSContext, resource: IAmplifyResource): Promise<void> => {
  await buildCustomResources(context, resource.resourceName);
};

// force major version bump for cdk v2
export async function getPermissionPolicies(context: $TSContext, resourceOpsMapping: $TSAny) {
  const permissionPolicies: any[] = [];
  const resourceAttributes: any[] = [];

  Object.keys(resourceOpsMapping).forEach((resourceName) => {
    let customResource = stateManager.getCustomPermissions(categoryName, resourceName);

    let customResourceJSON = JSON.stringify(customResource);

    customResourceJSON = customResourceJSON.replace(/\$\{categoryName\}/, categoryName);
    customResourceJSON = customResourceJSON.replace(/\$\{resourceName\}/, resourceName);

    customResource = JSON.parse(customResourceJSON);

    const crudOptions = resourceOpsMapping[resourceName];

    if (customResource.policies) {
      crudOptions.forEach((crudOption: string) => {
        const policies = customResource.policies[crudOption].map((policy: any) => {
          if (!policy.Effect) {
            return {
              Effect: 'Allow',
              Action: policy.Action,
              Resource: policy.Resource,
            };
          }
          return policy;
        });

        for (const policy of policies) {
          if (!policy.Action || !policy.Resource) {
            printer.error(`Invalid policy in resources.json for ${categoryName}/${resourceName}.`);
          }

          permissionPolicies.push(policy);
        }
      });
    } else {
      printer.info(`No policies found for ${categoryName}/${resourceName}.`);
    }

    const attributes = customResource.attributes;

    if (attributes.length > 0) {
      resourceAttributes.push({
        resourceName,
        attributes,
        category: categoryName,
      });
    }
  });

  return { permissionPolicies, resourceAttributes };
}
