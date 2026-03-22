# Implementation Plan: MD 재고/판매 관리 시스템

> 작성일: 2026-03-23
> 실행 방식: Agent Team 병렬 구현
> 접근 제한: 관리자(김민석)만 접근 가능

---

## 요구사항

| 기능 | 설명 |
|------|------|
| 품목 관리 | MD 품목 CRUD (이름, 카테고리, 이미지, 생산가, 판매가) |
| 재고 추적 | 입고/판매/자소 실시간 재고수량 자동 계산 |
| 자소 추적 | 증정/프로모션 물량 "어디로, 왜" 기록 |
| 수익 분석 | 품목별/카테고리별/기간별 매출·원가·순이익 |
| 카테고리 | 의류, 액세서리, 스티커/인쇄물, 기타 |
| 관리자 전용 | isAdmin=true인 사용자만 접근 |

## DB 스키마

- `md_categories` — 카테고리 (name, color, icon, sort_order)
- `md_items` — 품목 (name, category_id, production_cost, selling_price, initial_stock)
- `md_stock_logs` — 변동이력 (item_id, log_type, quantity, unit_price, jaso_destination, jaso_purpose)
- `md_stock_summary` — VIEW (실시간 재고 집계)

## 파일 목록

### 신규 (11개)
- `src/services/mdService.js`
- `src/pages/MdInventory.jsx`
- `src/components/md/MdItemsTab.jsx`
- `src/components/md/MdStockTab.jsx`
- `src/components/md/MdLogsTab.jsx`
- `src/components/md/MdRevenueTab.jsx`
- `src/components/md/MdItemModal.jsx`
- `src/components/md/MdLogModal.jsx`
- `src/components/md/MdCategoryBadge.jsx`
- `src/components/md/MdStockBadge.jsx`
- `src/components/dashboard/MdSummaryMini.jsx`

### 수정 (3개)
- `src/App.jsx` — /md 라우트 추가
- `src/components/Sidebar.jsx` — 관리자 전용 메뉴 추가
- `src/pages/Dashboard.jsx` — 위젯 추가 (관리자만)

## Phase 순서

1. DB + Service
2. 품목 관리 탭
3. 재고/판매/자소 기록
4. 수익 분석 + 대시보드 위젯
5. 통합 + 빌드 검증

---

## 이전 계획

> SNS 모니터링 확장 (2026-03-10)
