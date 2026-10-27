import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectGoProject,
  detectJavaProject,
  detectDotNetProject,
  detectMakefileTestTarget,
  resolveValidationCommand,
} from './validation.js';

test('Compiled Languages & Enterprise Build Tool Detection Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scout-compiled-langs-'));
  });

  t.afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Accurately detects Go modules and workspaces', async () => {
    assert.strictEqual(detectGoProject(tmpDir), false);

    // go.mod
    await fs.promises.writeFile(path.join(tmpDir, 'go.mod'), 'module github.com/scout/service\n\ngo 1.22\n');
    assert.strictEqual(detectGoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'go test ./...');

    await fs.promises.unlink(path.join(tmpDir, 'go.mod'));

    // go.work
    await fs.promises.writeFile(path.join(tmpDir, 'go.work'), 'go 1.22\n\nuse (\n\t./service\n)\n');
    assert.strictEqual(detectGoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'go test ./...');
  });

  await t.test('2. Accurately detects Gradle wrapper and build configurations', async () => {
    assert.strictEqual(detectJavaProject(tmpDir), null);

    // gradlew Unix wrapper takes highest priority
    await fs.promises.writeFile(path.join(tmpDir, 'gradlew'), '#!/bin/sh\nexec gradle "$@"\n');
    assert.strictEqual(detectJavaProject(tmpDir), './gradlew test');
    assert.strictEqual(resolveValidationCommand(tmpDir), './gradlew test');

    await fs.promises.unlink(path.join(tmpDir, 'gradlew'));

    // Windows gradlew.bat
    await fs.promises.writeFile(path.join(tmpDir, 'gradlew.bat'), '@echo off\n');
    assert.strictEqual(detectJavaProject(tmpDir), './gradlew test');
    assert.strictEqual(resolveValidationCommand(tmpDir), './gradlew test');

    await fs.promises.unlink(path.join(tmpDir, 'gradlew.bat'));

    // Groovy build.gradle
    await fs.promises.writeFile(path.join(tmpDir, 'build.gradle'), 'plugins { id "java" }\n');
    assert.strictEqual(detectJavaProject(tmpDir), 'gradle test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'gradle test');

    await fs.promises.unlink(path.join(tmpDir, 'build.gradle'));

    // Kotlin build.gradle.kts
    await fs.promises.writeFile(path.join(tmpDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }\n');
    assert.strictEqual(detectJavaProject(tmpDir), 'gradle test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'gradle test');
  });

  await t.test('3. Accurately detects Maven wrapper and pom.xml configurations', async () => {
    // mvnw wrapper takes priority over pom.xml
    await fs.promises.writeFile(path.join(tmpDir, 'mvnw'), '#!/bin/sh\n');
    assert.strictEqual(detectJavaProject(tmpDir), './mvnw test');
    assert.strictEqual(resolveValidationCommand(tmpDir), './mvnw test');

    await fs.promises.unlink(path.join(tmpDir, 'mvnw'));

    // Standard pom.xml
    await fs.promises.writeFile(
      path.join(tmpDir, 'pom.xml'),
      '<project xmlns="http://maven.apache.org/POM/4.0.0"></project>',
    );
    assert.strictEqual(detectJavaProject(tmpDir), 'mvn test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'mvn test');
  });

  await t.test('4. Accurately detects .NET solution and project files', async () => {
    assert.strictEqual(detectDotNetProject(tmpDir), false);

    // Visual Studio Solution (.sln)
    await fs.promises.writeFile(path.join(tmpDir, 'Backend.sln'), 'Microsoft Visual Studio Solution File');
    assert.strictEqual(detectDotNetProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'dotnet test');

    await fs.promises.unlink(path.join(tmpDir, 'Backend.sln'));

    // C# Project (.csproj)
    await fs.promises.writeFile(path.join(tmpDir, 'Core.csproj'), '<Project Sdk="Microsoft.NET.Sdk"/>');
    assert.strictEqual(detectDotNetProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'dotnet test');

    await fs.promises.unlink(path.join(tmpDir, 'Core.csproj'));

    // F# Project (.fsproj)
    await fs.promises.writeFile(path.join(tmpDir, 'Core.fsproj'), '<Project Sdk="Microsoft.NET.Sdk"/>');
    assert.strictEqual(detectDotNetProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'dotnet test');
  });

  await t.test('5. Accurately detects Make targets (test and check)', async () => {
    assert.strictEqual(detectMakefileTestTarget(tmpDir), null);

    // Makefile test target
    await fs.promises.writeFile(path.join(tmpDir, 'Makefile'), 'build:\n\t@echo build\n\ntest:\n\t@echo test\n');
    assert.strictEqual(detectMakefileTestTarget(tmpDir), 'make test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'make test');

    await fs.promises.unlink(path.join(tmpDir, 'Makefile'));

    // GNUmakefile check target
    await fs.promises.writeFile(path.join(tmpDir, 'GNUmakefile'), 'check:\n\t@echo checking\n');
    assert.strictEqual(detectMakefileTestTarget(tmpDir), 'make check');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'make check');
  });
});
