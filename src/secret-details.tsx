import { Component, K8sApi } from "@k8slens/extensions";
import React from "react";
import tls, { PeerCertificate } from "tls";
import net from "net";

export class SecretDetails extends React.Component<
  Component.KubeObjectDetailsProps<K8sApi.Secret>
> {
  formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const color = now > date ? "red" : "";

    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return (
      <span color={color}>
        {dateString} <i>(Valid: {diffInDays} days)</i>
      </span>
    );
  }

  formatSAN(subjectaltname: string) {
    return subjectaltname?.split(/, /).map((s) => (
      <React.Fragment>
        {s}
        <br />
      </React.Fragment>
    ));
  }

  render() {
    const secretKeys = this.props.object.getKeys();
    const certificates: any[] = [];

    for (const key of secretKeys) {
      const certificateString = Buffer.from(
        this.props.object.data[key],
        "base64"
      ).toString("ascii");

      if (!certificateString.startsWith("-----BEGIN CERTIFICATE-----"))
        continue;

      try {
        let secureContext = tls.createSecureContext({
          cert: certificateString,
        });

        let secureSocket = new tls.TLSSocket(new net.Socket(), {
          secureContext,
        });
        let cert: PeerCertificate = secureSocket.getCertificate() as PeerCertificate;

        certificates.push(
          <div>
            <Component.DrawerTitle title={"Certificate Info - " + key} />
            <Component.DrawerItem name="CN">
              {cert.subject.CN}
            </Component.DrawerItem>
            <Component.DrawerItem name="SAN">
              {this.formatSAN(cert.subjectaltname)}
            </Component.DrawerItem>
            <Component.DrawerItem name="Issuer">
              {this.formatSAN(cert.issuer.CN)}
            </Component.DrawerItem>
            <Component.DrawerItem name="Not before">
              {cert.valid_from}
            </Component.DrawerItem>
            <Component.DrawerItem name="Expires">
              {this.formatDate(cert.valid_to)}
            </Component.DrawerItem>
          </div>
        );
      } catch (e) {
        console.error(e);
      }
    }

    return <div>{certificates}</div>;
  }
}
