export class Container {
  private static instance: Container;
  private dependencies: Map<string, any>;

  private constructor() {
    this.dependencies = new Map();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  public register<T>(key: string, dependency: T): void {
    this.dependencies.set(key, dependency);
  }

  public get<T>(key: string): T {
    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency ${key} not found`);
    }
    return dependency as T;
  }

  public has(key: string): boolean {
    return this.dependencies.has(key);
  }

  public remove(key: string): void {
    this.dependencies.delete(key);
  }

  public clear(): void {
    this.dependencies.clear();
  }
}
