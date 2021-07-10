import { Renderer } from "@k8slens/extensions";
import React from "react";
import tls, { PeerCertificate } from "tls";
import net from "net";

export class SecretDetails extends React.Component<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>> {
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
          cert: certificateString
        });

        let secureSocket = new tls.TLSSocket(new net.Socket(), {
          secureContext
        });
        let cert: PeerCertificate = secureSocket.getCertificate() as PeerCertificate;

        certificates.push(
          <div>
            <Renderer.Component.DrawerTitle title={"Certificate Info - " + key} />
            <Renderer.Component.DrawerItem name="CN">
              {cert.subject.CN}
            </Renderer.Component.DrawerItem>
            <Renderer.Component.DrawerItem name="SAN">
              {this.formatSAN(cert.subjectaltname)}
            </Renderer.Component.DrawerItem>
            <Renderer.Component.DrawerItem name="Issuer">
              {cert.issuer.CN}
            </Renderer.Component.DrawerItem>
            <Renderer.Component.DrawerItem name="Not before">
              {cert.valid_from}
            </Renderer.Component.DrawerItem>
            <Renderer.Component.DrawerItem name="Expires">
              {this.formatDate(cert.valid_to)}
            </Renderer.Component.DrawerItem>
          </div>
        );
      } catch (e) {
        console.error(e);
      }
    }

    return <div>{certificates}</div>;
  }
}
