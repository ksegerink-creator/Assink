#!/usr/bin/env bash
# Completes a server certificate's chain the way a browser does: follow the
# "CA Issuers" address in each certificate and download the issuer, until a
# self-signed certificate is reached or there is no address left. Prints the
# downloaded certificates as PEM on stdout.
#
# Used by the deploy workflow, because the FTP server sends its certificate
# without the intermediates and Node then refuses the connection. The result
# goes into NODE_EXTRA_CA_CERTS; Node still checks the whole chain up to a
# root certificate it already trusts, so nothing is accepted on trust.
#
# Usage: fetch-cert-chain.sh <certificate.pem>
set -euo pipefail

current="$1"
work="$(mktemp -d)"
for hop in 1 2 3 4; do
  url="$(openssl x509 -in "$current" -noout -ext authorityInfoAccess 2>/dev/null |
    sed -n 's/.*CA Issuers - URI:\(http[^ ]*\).*/\1/p' | head -n 1)"
  [ -n "$url" ] || break
  echo "Uitgever ophalen: $url" >&2
  curl -fsS --max-time 20 "$url" -o "$work/issuer.raw"
  next="$work/issuer-$hop.pem"
  openssl x509 -inform DER -in "$work/issuer.raw" -out "$next" 2>/dev/null ||
    openssl x509 -in "$work/issuer.raw" -out "$next"
  cat "$next"
  # Stop at a self-signed certificate: subject equals issuer.
  if [ "$(openssl x509 -in "$next" -noout -subject)" = "subject=$(openssl x509 -in "$next" -noout -issuer | sed 's/^issuer=//')" ]; then
    break
  fi
  current="$next"
done
