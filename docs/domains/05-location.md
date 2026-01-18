# Location Domain API

> PostGIS 기반 위치 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Location API |
| **프로토콜** | HTTP REST + gRPC (Internal) |
| **데이터베이스** | PostgreSQL + PostGIS |
| **특징** | 공간 쿼리, Zoom Policy |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Location Domain                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                    ┌──────────────┐          │
│   │   HTTP API   │◀──────────────────▶│   gRPC API   │          │
│   │  (External)  │                    │  (Internal)  │          │
│   └──────┬───────┘                    └──────┬───────┘          │
│          │                                   │                   │
│          └─────────────┬─────────────────────┘                   │
│                        │                                         │
│                        ▼                                         │
│          ┌─────────────────────────────┐                        │
│          │      Location Service       │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │    Zoom Policy        │  │  Level-based filtering │
│          │  │     Service           │  │                        │
│          │  └───────────────────────┘  │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │   Spatial Query       │  │  PostGIS ST_*          │
│          │  │     Engine            │  │                        │
│          │  └───────────────────────┘  │                        │
│          └─────────────┬───────────────┘                        │
│                        │                                         │
│          ┌─────────────▼───────────────┐                        │
│          │   PostgreSQL + PostGIS      │                        │
│          │                             │                        │
│          │  ┌─────────────────────┐    │                        │
│          │  │ collection_points   │    │  수거함 위치            │
│          │  │ (GEOMETRY POINT)    │    │                        │
│          │  └─────────────────────┘    │                        │
│          │                             │                        │
│          │  ┌─────────────────────┐    │                        │
│          │  │ service_areas       │    │  서비스 영역            │
│          │  │ (GEOMETRY POLYGON)  │    │                        │
│          │  └─────────────────────┘    │                        │
│          │                             │                        │
│          │  ┌─────────────────────┐    │                        │
│          │  │ bulk_waste_zones    │    │  대형폐기물 구역         │
│          │  │ (GEOMETRY POLYGON)  │    │                        │
│          │  └─────────────────────┘    │                        │
│          └─────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### HTTP REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/locations/collection-points` | 수거함 목록 조회 |
| `GET` | `/locations/collection-points/nearby` | 근처 수거함 검색 |
| `GET` | `/locations/service-areas` | 서비스 영역 조회 |
| `GET` | `/locations/bulk-waste-zones` | 대형폐기물 구역 조회 |
| `POST` | `/locations/geocode` | 주소 → 좌표 변환 |
| `POST` | `/locations/reverse-geocode` | 좌표 → 주소 변환 |

### gRPC Service (Internal)

```protobuf
service LocationService {
  // Chat Worker에서 호출 - 근처 수거함 검색
  rpc GetNearbyCollectionPoints(NearbyRequest) returns (CollectionPointsResponse);

  // 서비스 영역 확인
  rpc CheckServiceArea(PointRequest) returns (ServiceAreaResponse);

  // 대형폐기물 구역 정보
  rpc GetBulkWasteZone(PointRequest) returns (BulkWasteZoneResponse);
}
```

---

## Key Implementation Patterns

### 1. PostGIS Spatial Queries

```sql
-- 근처 수거함 검색 (반경 기반)
SELECT id, name, type,
       ST_Distance(
           location::geography,
           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
       ) as distance
FROM collection_points
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
    :radius_meters
)
ORDER BY distance
LIMIT :limit;

-- 서비스 영역 포함 여부
SELECT id, name, district
FROM service_areas
WHERE ST_Contains(
    boundary,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
);
```

### 2. Zoom Policy Service

```python
class ZoomPolicyService:
    """줌 레벨별 데이터 필터링 정책"""

    POLICIES = {
        # zoom_level: (max_points, clustering_enabled, min_importance)
        (0, 5): (50, True, 10),      # 국가 레벨: 클러스터링
        (6, 10): (200, True, 5),     # 시/도 레벨: 중요도 필터
        (11, 14): (500, False, 2),   # 구/군 레벨: 상세
        (15, 20): (1000, False, 0),  # 동/리 레벨: 전체
    }

    def get_policy(self, zoom_level: int) -> ZoomPolicy:
        for (min_z, max_z), config in self.POLICIES.items():
            if min_z <= zoom_level <= max_z:
                return ZoomPolicy(*config)
        return ZoomPolicy(1000, False, 0)

    def apply_filter(self, points: list, zoom_level: int) -> list:
        policy = self.get_policy(zoom_level)
        filtered = [p for p in points if p.importance >= policy.min_importance]

        if policy.clustering_enabled:
            return self.cluster_points(filtered, zoom_level)

        return filtered[:policy.max_points]
```

### 3. Collection Point Types

| Type | Description | Icon |
|------|-------------|------|
| `RECYCLING` | 분리수거함 | ♻️ |
| `CLOTHING` | 의류 수거함 | 👕 |
| `BATTERY` | 폐건전지 수거함 | 🔋 |
| `MEDICINE` | 폐의약품 수거함 | 💊 |
| `FLUORESCENT` | 폐형광등 수거함 | 💡 |
| `FOOD_WASTE` | 음식물 쓰레기 | 🍽️ |

---

## Chat Worker Integration

```python
# LangGraph location_node에서 gRPC 호출
async def location_node(state: ChatState) -> dict:
    user_location = state.get("user_location")

    if user_location:
        # gRPC로 근처 수거함 검색
        nearby = await location_client.get_nearby_collection_points(
            lat=user_location["lat"],
            lng=user_location["lng"],
            radius=1000,  # 1km
            limit=5,
        )

        return {
            "location_context": format_nearby_points(nearby),
            "has_location": True,
        }

    return {"has_location": False}
```

---

## Database Schema

```sql
-- 수거함 위치 테이블
CREATE TABLE collection_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    address VARCHAR(500),
    operating_hours VARCHAR(255),
    importance INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 공간 인덱스
CREATE INDEX idx_collection_points_location
ON collection_points USING GIST (location);

-- 서비스 영역 테이블
CREATE TABLE service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100),
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_service_areas_boundary
ON service_areas USING GIST (boundary);
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **PostgreSQL**: PostGIS 확장 활성화
- **gRPC**: Internal service mesh
- **Redis**: Query result cache
