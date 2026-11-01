import { Common, type Renderer } from "@freelensapp/extensions";
import React from "react";
import { ErrorPage } from "./error-page";

type DetailRegistration = Renderer.LensExtension["kubeObjectDetailItems"][number];

export interface ErrorBoundaryProps {
  extension: Renderer.LensExtension;
  /**
   * A new value clears the error and renders the children again: the object of a details panel, which the host
   * replaces with a new one when the object changes.
   */
  resetKey?: unknown;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
  error?: unknown;
  resetKey?: unknown;
}

/**
 * Keeps an error that its children throw while React renders them inside the boundary: it logs the error with the
 * name of the extension and the component stack, and renders the error page in place of the children.
 *
 * A `try`/`catch` around the call of a component does not see such an error: a child component renders later than
 * the call. The host has no boundary around the details drawer of an extension, and its boundary around the cluster
 * frame would replace the whole cluster view. The registrations of the extension are wrapped with
 * `withDetailsErrorBoundary`.
 *
 * It is a class component of the host's React, because only a class component can be an error boundary, with no
 * decorators and no `observer`: it reads no observable, and the children it renders are observers of their own.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { failed: true, error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): ErrorBoundaryState | null {
    return Object.is(props.resetKey, state.resetKey) ? null : { failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    Common.logger.error(`[${this.props.extension.name}]: ${error}`, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ErrorPage error={this.state.error} />;
  }
}

/**
 * The registration of a details panel, made by `Renderer.K8sApi.detailsFor`, with the panel inside an error boundary
 * that renders it again for a new object.
 */
export function withDetailsErrorBoundary(
  extension: Renderer.LensExtension,
  registration: DetailRegistration,
): DetailRegistration {
  const { Details } = registration.components;

  return {
    ...registration,
    components: {
      ...registration.components,
      Details: (props) => (
        <ErrorBoundary extension={extension} resetKey={props.object}>
          <Details {...props} />
        </ErrorBoundary>
      ),
    },
  };
}
