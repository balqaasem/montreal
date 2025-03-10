import { copyFile, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cancel,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import {
  url,
  exec,
  execSyncOpts,
  internalContentDirs,
  internalContentFiles,
  supportedPackageManagers,
} from './utils.js';

const cloneMontreal = async (name: string, packageManager: string) => {
  const command = [
    'npx create-next-app@latest',
    name,
    '--example',
    url,
    '--disable-git',
    '--skip-install',
    `--use-${packageManager}`,
  ];

  await exec(command.join(' '), execSyncOpts);
};

const deleteInternalContent = async () => {
  for (const folder of internalContentDirs) {
    await rm(folder, { recursive: true, force: true });
  }

  for (const file of internalContentFiles) {
    await rm(file, { force: true });
  }
};

const installDependencies = async (packageManager: string) => {
  const suffix = packageManager === 'npm' ? '--force' : '';

  await exec(`${packageManager} install ${suffix}`, execSyncOpts);
};

const initializeGit = async () => {
  await exec('git init', execSyncOpts);
  await exec('git add .', execSyncOpts);
  await exec('git commit -m "✨ Initial commit"', execSyncOpts);
};

const setupEnvironmentVariables = async () => {
  const files = [
    { source: join('apps', 'api'), target: '.env.local' },
    { source: join('apps', 'app'), target: '.env.local' },
    { source: join('apps', 'web'), target: '.env.local' },
    { source: join('packages', 'cms'), target: '.env.local' },
    { source: join('packages', 'database'), target: '.env' },
  ];

  for (const { source, target } of files) {
    await copyFile(join(source, '.env.example'), join(source, target));
  }
};

const setupOrm = async (packageManager: string) => {
  const filterCommand = packageManager === 'npm' ? '--workspace' : '--filter';

  const command = [
    packageManager,
    'run',
    'build',
    filterCommand,
    '@repo/database',
  ].join(' ');

  await exec(command, execSyncOpts);
};

const updatePackageManagerConfiguration = async (
  projectDir: string,
  packageManager: string
) => {
  const packageJsonPath = join(projectDir, 'package.json');
  const packageJsonFile = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonFile);

  if (packageManager === 'npm') {
    packageJson.packageManager = 'npm@10.8.1';
  } else if (packageManager === 'yarn') {
    packageJson.packageManager = 'yarn@1.22.22';
  }

  const newPackageJson = JSON.stringify(packageJson, null, 2);

  await writeFile(packageJsonPath, `${newPackageJson}\n`);
};

const updateInternalPackageDependencies = async (path: string) => {
  const pkgJsonFile = await readFile(path, 'utf8');
  const pkgJson = JSON.parse(pkgJsonFile);

  if (pkgJson.dependencies) {
    // Update dependencies
    const entries = Object.entries(pkgJson.dependencies);

    for (const [dep, version] of entries) {
      if (version === 'workspace:*') {
        pkgJson.dependencies[dep] = '*';
      }
    }
  }

  if (pkgJson.devDependencies) {
    // Update devDependencies
    const entries = Object.entries(pkgJson.devDependencies);

    for (const [dep, version] of entries) {
      if (version === 'workspace:*') {
        pkgJson.devDependencies[dep] = '*';
      }
    }
  }

  const newPkgJson = JSON.stringify(pkgJson, null, 2);

  await writeFile(path, `${newPkgJson}\n`);
};

const updateInternalDependencies = async (projectDir: string) => {
  const rootPackageJsonPath = join(projectDir, 'package.json');
  await updateInternalPackageDependencies(rootPackageJsonPath);

  const workspaceDirs = ['apps', 'packages'];

  for (const dir of workspaceDirs) {
    const dirPath = join(projectDir, dir);
    const packages = await readdir(dirPath);

    for (const pkg of packages) {
      const path = join(dirPath, pkg, 'package.json');
      await updateInternalPackageDependencies(path);
    }
  }
};

const getName = async () => {
  const value = await text({
    message: 'What is your project named?',
    placeholder: 'my-app',
    validate(value: string) {
      if (value.length === 0) {
        return 'Please enter a project name.';
      }
    },
  });

  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return value.toString();
};

const getPackageManager = async () => {
  const value = await select({
    message: 'Which package manager would you like to use?',
    options: supportedPackageManagers.map((choice) => ({
      value: choice,
      label: choice,
    })),
    initialValue: 'bun',
  });

  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return value.toString() as (typeof supportedPackageManagers)[number];
};

export const initialize = async (options: {
  name?: string;
  packageManager?: string;
  disableGit?: boolean;
}) => {
  try {
    intro("Let's start a Montreal project!");

    const cwd = process.cwd();
    const name = options.name || (await getName());
    const packageManager =
      options.packageManager || (await getPackageManager());

    if (!supportedPackageManagers.includes(packageManager)) {
      throw new Error('Invalid package manager');
    }

    const s = spinner();
    const projectDir = join(cwd, name);

    s.start('Cloning Montreal...');
    await cloneMontreal(name, packageManager);

    s.message('Moving into repository...');
    process.chdir(projectDir);

    if (packageManager !== 'bun') {
      s.message('Updating package manager configuration...');
      await updatePackageManagerConfiguration(projectDir, packageManager);

      s.message('Updating workspace dependencies...');
      await updateInternalDependencies(projectDir);
    }

    s.message('Setting up environment variable files...');
    await setupEnvironmentVariables();

    s.message('Deleting internal content...');
    await deleteInternalContent();

    s.message('Installing dependencies...');
    await installDependencies(packageManager);

    s.message('Setting up ORM...');
    await setupOrm(packageManager);

    if (!options.disableGit) {
      s.message('Initializing Git repository...');
      await initializeGit();
    }

    s.stop('Project initialized successfully!');

    outro(
      'Please make sure you install the Mintlify CLI and Stripe CLI before starting the project.'
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Failed to initialize project: ${error}`;

    log.error(message);
    process.exit(1);
  }
};
