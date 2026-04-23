/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, button, link, small } from './_brand.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Layout preview="Confirm your email for the TF USA Partner Portal">
    <Heading style={h1}>Confirm your email</Heading>
    <Text style={text}>
      Thanks for signing up to the{' '}
      <Link href={siteUrl} style={link}>TF USA Partner Portal</Link>.
    </Text>
    <Text style={text}>
      Please confirm your email address ({recipient}) by clicking the button below.
    </Text>
    <Button style={button} href={confirmationUrl}>Verify Email</Button>
    <Text style={small}>
      If you didn't create an account, you can safely ignore this email.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default SignupEmail
