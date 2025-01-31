import { Renderer } from "@freelensapp/extensions";
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
      const secretString = Buffer.from(
        this.props.object.data[key],
        "base64"
      ).toString("ascii");

      const PEM_CERTIFICATE_HEADER = "-----BEGIN CERTIFICATE-----";
      const PEM_CERTIFICATE_FOOTER = "-----END CERTIFICATE-----";

      const certificateStrings = secretString.split(PEM_CERTIFICATE_FOOTER);

      for (let i = 0; i < certificateStrings.length; i++) {
        const certificateString = certificateStrings[i] + PEM_CERTIFICATE_FOOTER;

        if (!certificateString.includes(PEM_CERTIFICATE_HEADER) ||
          !certificateString.includes(PEM_CERTIFICATE_FOOTER)) {
          // The certificate string does not have the correct PEM format
          continue;
        }

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
              <Renderer.Component.DrawerTitle>Certificate Info - {key} ({i + 1})</Renderer.Component.DrawerTitle>
              <Renderer.Component.DrawerItem name="CN">
                {cert.subject.CN}
              </Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="SAN">
                {this.formatSAN(cert.subjectaltname)}
              </Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Serial Number">
                {cert.serialNumber}
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
    }

    return <div>{certificates}</div>;
  }
}
