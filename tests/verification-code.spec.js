import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/api';

async function openCodeForm(page, flow) {
  if (flow === 'email') {
    await page.goto('/signup');
    await page.locator('[name=email]').fill('audit@example.com');
    await page.locator('[name=password]').fill('StrongPass123');
    await page.locator('[name=confirm]').fill('StrongPass123');
    await page.locator('[name=nickname]').fill('점검');
    await page.getByRole('button', { name: '가입하고 인증 코드 받기' }).click();
  } else {
    await page.goto('/password/forgot');
    await page.getByRole('textbox', { name: '가입한 이메일' }).fill('audit@example.com');
    await page.getByRole('button', { name: '코드 받기', exact: true }).click();
  }
  await expect(page.locator('.code-boxes input')).toHaveCount(6);
}

async function expectDigits(page, digits) {
  await expect.poll(() => page.locator('.code-boxes input').evaluateAll((boxes) => boxes.map((box) => box.value))).toEqual(digits);
}

async function paste(box, text) {
  await box.focus();
  await box.evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
}

for (const flow of ['email', 'password']) {
  test(`${flow}: 중간 자리 삭제·교체 시 나머지 위치를 유지하고 완성된 코드만 문자열로 제출한다`, async ({ page }) => {
    const submitted = [];
    await mockApi(page, (route, url) => {
      if (url.pathname.endsWith('/email/verify') || url.pathname.endsWith('/password/verify-code')) submitted.push(route.request().postDataJSON());
      return false;
    });
    await openCodeForm(page, flow);
    if (flow === 'password') {
      await page.locator('input[type=password]').nth(0).fill('StrongPass123');
      await page.locator('input[type=password]').nth(1).fill('StrongPass123');
    }
    const boxes = page.locator('.code-boxes input');
    const submit = page.getByRole('button', { name: flow === 'email' ? '확인' : '비밀번호 바꾸고 로그인', exact: true });
    await boxes.first().fill('123456');
    await expectDigits(page, ['1', '2', '3', '4', '5', '6']);
    await boxes.nth(2).fill('');
    await expectDigits(page, ['1', '2', '', '4', '5', '6']);
    await expect(submit).toBeDisabled();
    await page.locator('form').evaluate((form) => form.requestSubmit());
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(submitted).toHaveLength(0);
    await boxes.nth(2).fill('9');
    await expectDigits(page, ['1', '2', '9', '4', '5', '6']);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL('/');
    expect(submitted).toEqual([{ email: 'audit@example.com', code: '129456' }]);
  });

  test(`${flow}: 개발용 코드 채우기는 앞자리 0을 유지하고 재전송 시 여섯 칸을 비운다`, async ({ page }) => {
    await mockApi(page, async (route, url) => {
      if (!['/api/v1/auth/signup', '/api/v1/auth/password/forgot', '/api/v1/auth/email/resend'].includes(url.pathname)) return false;
      await route.fulfill({ json: { expiresInSeconds: 600, devCode: '012345' } });
      return true;
    });
    await openCodeForm(page, flow);
    await page.getByRole('button', { name: '채우기', exact: true }).click();
    await expectDigits(page, ['0', '1', '2', '3', '4', '5']);
    await page.getByRole('button', { name: flow === 'email' ? '코드 다시 보내기' : '다시 보내기', exact: true }).click();
    await expectDigits(page, ['', '', '', '', '', '']);
  });
}

test('전체·부분 붙여넣기, 자동 입력 뒤 자리 교체, 숫자가 아닌 붙여넣기를 처리한다', async ({ page }) => {
  const submitted = [];
  await mockApi(page, (route, url) => {
    if (url.pathname.endsWith('/password/verify-code')) submitted.push(route.request().postDataJSON());
    return false;
  });
  await openCodeForm(page, 'password');
  const boxes = page.locator('.code-boxes input');
  await boxes.first().fill('123456');
  await boxes.nth(2).focus();
  await boxes.nth(2).evaluate((box) => box.setSelectionRange(0, 0));
  await page.keyboard.type('9');
  await expectDigits(page, ['1', '2', '9', '4', '5', '6']);
  await boxes.first().fill('123456');
  await paste(boxes.nth(2), '98');
  await expectDigits(page, ['1', '2', '9', '8', '5', '6']);
  await paste(boxes.nth(4), '012 345');
  await expectDigits(page, ['0', '1', '2', '3', '4', '5']);
  await expect(boxes.last()).toBeFocused();
  await page.keyboard.type('9');
  await expectDigits(page, ['0', '1', '2', '3', '4', '9']);
  await paste(boxes.nth(2), 'abc');
  await expectDigits(page, ['0', '1', '2', '3', '4', '9']);
  await page.locator('input[type=password]').nth(0).fill('StrongPass123');
  await page.locator('input[type=password]').nth(1).fill('StrongPass123');
  await page.getByRole('button', { name: '비밀번호 바꾸고 로그인', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(submitted[0].code).toBe('012349');
});

test('빈 자리에서 뒤로 지우기와 방향키를 사용해도 다른 자리의 숫자가 당겨지지 않는다', async ({ page }) => {
  await mockApi(page);
  await openCodeForm(page, 'password');
  const boxes = page.locator('.code-boxes input');
  await boxes.first().fill('123456');
  await boxes.nth(2).press('Backspace');
  await expectDigits(page, ['1', '2', '', '4', '5', '6']);
  await boxes.nth(2).press('Backspace');
  await expectDigits(page, ['1', '', '', '4', '5', '6']);
  await expect(boxes.nth(1)).toBeFocused();
  await page.keyboard.type('9');
  await expectDigits(page, ['1', '9', '', '4', '5', '6']);
  await page.keyboard.press('ArrowRight');
  await expect(boxes.nth(3)).toBeFocused();
  await page.keyboard.type('8');
  await expectDigits(page, ['1', '9', '', '8', '5', '6']);
});
