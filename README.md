[![Check](https://github.com/jkroepke/lens-extension-certificate-info/actions/workflows/check.yaml/badge.svg)](https://github.com/jkroepke/lens-extension-certificate-info/actions/workflows/check.yaml)
[![GitHub license](https://img.shields.io/github/license/jkroepke/lens-extension-certificate-info)](https://github.com/jkroepke/lens-extension-certificate-info/blob/main/LICENSE.txt)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jkroepke/lens-extension-certificate-info?logo=github)](https://www.npmjs.com/package/lens-certificate-info)
[![GitHub all releases](https://img.shields.io/github/downloads/jkroepke/lens-extension-certificate-info/total?logo=github)](https://github.com/jkroepke/lens-extension-certificate-info/releases/latest)
[![npm](https://img.shields.io/npm/dm/lens-certificate-info?logo=npm)](https://www.npmjs.com/package/lens-certificate-info)

# lens-extension-certificate-info

⭐ Don't forget to star this repository! ⭐

See expire date from certificates inside kubernetes secrets.

![Certificate details in secrets overview](docs/secrets.png)

Only PEM formatted single certificated are supported yet.

Pull request for more supported formats like Java Keystore, PKCS#12 are welcome.

## Compatibility

| Version                                                | Extension Version |
|--------------------------------------------------------|-------------------|
| [OpenLens](https://github.com/MuhammedKalkan/OpenLens) | <3                |
| [FreeLens](https://github.com/freelensapp/freelens)    | >=4               |

## Installation

### Direct link to Lens

[lens://app/extensions/install/lens-certificate-info](lens://app/extensions/install/lens-certificate-info)

### Manual installation

Menu > Extensions and search for `lens-certificate-info`.

### Alternatives downloads

#### Github

[https://github.com/jkroepke/lens-extension-certificate-info/releases/latest/download/lens-certificate-info.tgz](https://github.com/jkroepke/lens-extension-certificate-info/releases/latest/download/lens-certificate-info.tgz)

#### NPM

[https://registry.npmjs.org/lens-certificate-info/-/lens-certificate-info-$VERSION.tgz](https://registry.npmjs.org/lens-certificate-info/-/lens-certificate-info-$VERSION.tgz)

Replace `$VERSION` with a real version like `1.1.2`.

## Copyright and license

© 2021 [Jan-Otto Kröpke (jkroepke)](https://github.com/jkroepke/lens-extension-certificate-info)

Licensed under the [Apache License, Version 2.0](LICENSE)

## Open Source Sponsors

Thanks to all sponsors!

* [@hegawa](https://github.com/hegawa) (25$) onetime
* [@Zero-Down-Time](https://github.com/Zero-Down-Time) (25$) onetime

## Acknowledgements

Thanks to JetBrains IDEs for their support.

<table>
  <thead>
    <tr>
      <th><a href="https://www.jetbrains.com/?from=jkroepke">JetBrains IDEs</a></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <center>
          <a href="https://www.jetbrains.com/?from=jkroepke">
            <picture>
              <source srcset="https://www.jetbrains.com/company/brand/img/logo_jb_dos_3.svg" media="(prefers-color-scheme: dark)">
              <img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg" style="height: 50px">
            </picture>
          </a>
        </center>
      </td>
    </tr>
  </tbody>
</table>
