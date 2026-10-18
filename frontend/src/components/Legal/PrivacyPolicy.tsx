import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout, { List, Section } from './LegalLayout';
import { LEGAL, publisherLabel } from './legalInfo';

const mail = <a href={`mailto:${LEGAL.contactEmail}`} className="text-blue-700 underline">{LEGAL.contactEmail}</a>;

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-gray-500">Last updated: {LEGAL.lastUpdated}</p>

      <p>
        This policy explains how {publisherLabel} (“we”, “us”) handles your information when you use the
        {` ${LEGAL.appName}`} Android app and the website at <a href={LEGAL.siteUrl} className="text-blue-700 underline">{LEGAL.siteUrl.replace('https://', '')}</a> (together, the “Service”).
        The Service lets you record and track your own investments, cash, property, loans and expenses.
      </p>

      <Section title="Information we collect">
        <p><strong>Account information</strong> — when you create an account:</p>
        <List items={[
          'Your username.',
          'Your password, stored only as a one-way hash (bcrypt). We cannot see or recover it.',
          'An optional password hint, also stored only as a hash, used solely to let you reset a forgotten password.',
        ]} />
        <p><strong>Financial information you enter</strong> — everything you add to the Service, such as:</p>
        <List items={[
          'Stock transactions (symbol, quantity, price, fees, date, demat account name) and cash balances.',
          'Mutual fund holdings, transactions and SIP schedules.',
          'Real estate, interest-bearing loans you have given, and other investments.',
          'Monthly expenses and obligations, FIRE calculator inputs, and your app settings (such as account holder names).',
        ]} />
        <p>
          This is information you choose to type in or import. We do not connect to your bank, broker or demat account,
          and we do not collect payment card details.
        </p>
        <p><strong>Technical information</strong>:</p>
        <List items={[
          'Our servers and our network provider record standard request logs, which include your IP address, the time and the page or API address requested. We use these to operate the Service and to protect it, for example by limiting repeated sign-in attempts.',
          'After you sign in, a session token is stored on your device (the Android Keystore in the app, browser storage on the website) so you stay signed in. It expires after 7 days.',
        ]} />
        <p>
          We do not collect your location, contacts, photos, device identifiers or advertising ID, and the app contains
          no advertising or analytics SDKs.
        </p>
      </Section>

      <Section title="How we use your information">
        <List items={[
          'To provide the Service: store your data, calculate your portfolio values and show them to you.',
          'To keep your data in sync between the app and the website when you sign in with the same account.',
          'To secure the Service: authenticate you, prevent abuse and investigate problems.',
        ]} />
        <p>We do not sell your information, use it for advertising, or share it with anyone for their own purposes.</p>
      </Section>

      <Section title="Services we rely on">
        <p>We use the following providers to run the Service. They process data only on our behalf:</p>
        <List items={[
          <><strong>MongoDB Atlas</strong> — database hosting where your account and financial data are stored.</>,
          <><strong>Amazon Web Services</strong> — server hosting (Mumbai region).</>,
          <><strong>Cloudflare</strong> — network delivery and security for our website and API.</>,
        ]} />
        <p>
          To show live prices, our server requests market data from Yahoo Finance, AMFI India (mutual fund NAVs) and
          public exchange-rate services. These requests contain only stock symbols, fund scheme codes or currency
          pairs — never your username or account information.
        </p>
      </Section>

      <Section title="Security">
        <List items={[
          'All traffic between your device and our servers is encrypted with HTTPS.',
          'Passwords and password hints are stored only as salted hashes.',
          'Each account can access only its own data; every data request requires a valid session token.',
          'Sign-in, sign-up and password-reset attempts are rate limited.',
        ]} />
        <p>No method of storage or transmission is completely secure, but we work to protect your information.</p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          We keep your account and data for as long as your account exists. You can permanently delete your account at
          any time — in the app (<em>More → Delete account</em>) or on the <Link to="/delete-account/" className="text-blue-700 underline">Delete account</Link> page.
          Deletion immediately removes your account and all of your financial data from our database. Server request
          logs are kept for a limited period for security purposes and then discarded.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <List items={[
          'Access and export: view all of your data in the Service, and download it from the website with “Export Excel”.',
          'Correction: edit or remove any entry yourself at any time.',
          'Deletion: delete your account and all associated data as described above.',
        ]} />
        <p>For any other request about your data, contact us at {mail}.</p>
      </Section>

      <Section title="Children">
        <p>
          The Service is intended for adults managing their own finances and is not directed at children under 18. We do
          not knowingly collect information from children. If you believe a child has created an account, contact us and
          we will delete it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. We will change the “Last updated” date above and, for significant
          changes, notify you in the Service.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy or your data: {mail}.</p>
      </Section>
    </LegalLayout>
  );
}
