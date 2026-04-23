/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { main, outer, header, brandName, brandRed, brandSub, container, footerWrap, footerText, footerMuted, footerLinks, footerLink } from './_brand.ts'

interface LayoutProps {
  preview: string
  children: React.ReactNode
}

export const Layout = ({ preview, children }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Section style={header}>
          <Text style={brandName}>TOTAL <span style={brandRed}>FILTRATION</span></Text>
          <Text style={brandSub}>USA</Text>
        </Section>
        <Container style={container}>
          {children}
        </Container>
        <Section style={footerWrap}>
          <Text style={footerText}>Total Filtration USA LLC</Text>
          <Text style={footerMuted}>14422 Shoreside Way, Suite 110 #132, Winter Garden, Florida 34787</Text>
          <Text style={footerMuted}>
            +1-407-842-0818 |{' '}
            <a href="mailto:partners@total-filtration.com" style={footerLink}>partners@total-filtration.com</a>
          </Text>
          <Text style={footerLinks}>
            <a href="https://partners.total-filtration.com/privacy" style={footerLink}>Privacy Policy</a>
            {' · '}
            <a href="https://partners.total-filtration.com/terms" style={footerLink}>Terms &amp; Conditions</a>
          </Text>
        </Section>
      </Section>
    </Body>
  </Html>
)
