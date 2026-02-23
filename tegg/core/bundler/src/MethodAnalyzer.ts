import ts from 'typescript';

/**
 * Analyzes TypeScript class method bodies to determine which
 * injected properties (this.xxx) are actually accessed.
 *
 * This enables method-level tree shaking: only import the services
 * that a specific controller method actually uses.
 */
export class MethodAnalyzer {
  readonly #programCache = new Map<string, ts.Program>();

  #getProgram(filePath: string): ts.Program {
    if (!this.#programCache.has(filePath)) {
      this.#programCache.set(
        filePath,
        ts.createProgram([filePath], {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        }),
      );
    }
    return this.#programCache.get(filePath)!;
  }

  /**
   * Analyze a class method to find which `this.xxx` properties are accessed.
   *
   * Also follows calls to private/internal methods within the same class
   * to collect transitive `this.xxx` accesses.
   *
   * @param filePath - Absolute path to the TypeScript source file
   * @param className - Name of the class containing the method
   * @param methodName - Name of the method to analyze
   * @returns Set of property names accessed via `this.xxx`
   */
  analyze(filePath: string, className: string, methodName: string): Set<string> {
    const program = this.#getProgram(filePath);
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) return new Set();

    const classDecl = this.#findClass(sourceFile, className);
    if (!classDecl) return new Set();

    const methodDecl = this.#findMethod(classDecl, methodName);
    if (!methodDecl?.body) return new Set();

    // Collect names of all methods in the class so we can follow private method calls.
    // This includes both regular methods and ES private (#name) methods.
    const classMethodNames = new Set<string>();
    for (const member of classDecl.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      if (ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name)) {
        classMethodNames.add(member.name.text);
      }
    }

    const accessed = new Set<string>();
    const visitedMethods = new Set<string>([methodName]);

    this.#walkNode(classDecl, methodDecl.body, classMethodNames, visitedMethods, accessed);

    // Remove class method names from the result — #walkNode adds them as property accesses
    // (e.g. `this.#loadUser(id)` causes `#loadUser` to appear), but they are call targets,
    // not injected properties. Only injected property names are meaningful to callers.
    for (const name of classMethodNames) {
      accessed.delete(name);
    }

    return accessed;
  }

  #findClass(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | undefined {
    for (const stmt of sourceFile.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name?.text === className) {
        return stmt;
      }
    }
    return undefined;
  }

  #findMethod(classDecl: ts.ClassDeclaration, methodName: string): ts.MethodDeclaration | undefined {
    for (const member of classDecl.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      // Support both regular identifiers and ES private identifiers (#name)
      if ((ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name)) && member.name.text === methodName) {
        return member;
      }
    }
    return undefined;
  }

  #walkNode(
    classDecl: ts.ClassDeclaration,
    node: ts.Node,
    classMethodNames: Set<string>,
    visitedMethods: Set<string>,
    accessed: Set<string>,
  ): void {
    // Track all this.xxx accesses
    if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      accessed.add(node.name.text);
    }

    // When we see this.methodName(), follow the private method body
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
    ) {
      const calledMethodName = node.expression.name.text;
      if (classMethodNames.has(calledMethodName) && !visitedMethods.has(calledMethodName)) {
        visitedMethods.add(calledMethodName);
        const calledMethod = this.#findMethod(classDecl, calledMethodName);
        if (calledMethod?.body) {
          this.#walkNode(classDecl, calledMethod.body, classMethodNames, visitedMethods, accessed);
        }
      }
    }

    ts.forEachChild(node, (child) => {
      this.#walkNode(classDecl, child, classMethodNames, visitedMethods, accessed);
    });
  }
}
