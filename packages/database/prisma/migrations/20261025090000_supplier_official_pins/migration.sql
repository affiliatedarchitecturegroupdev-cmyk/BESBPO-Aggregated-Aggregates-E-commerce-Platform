-- Map pins for existing suppliers, taken from coordinates each operator publishes on its own website
-- (Afrimat branch locator, AfriSam locations map, Raumix contact map). Only suppliers with no pin yet
-- are filled in, so pins staff have already set or corrected are never overwritten.
UPDATE "SupplierLocation" AS s
SET "latitude" = v.lat, "longitude" = v.lng, "updatedAt" = now()
FROM (VALUES
  ('B2B-SUP-001', -26.179722::double precision, 27.883499::double precision), -- Roodepoort Plant (Cement)
  ('B2B-SUP-002', -26.179722::double precision, 25.989918::double precision), -- Dudfield (Cement)
  ('B2B-SUP-003', -28.322500::double precision, 24.221056::double precision), -- Ulco (Cement)
  ('SUP-001', -26.294111::double precision, 27.989944::double precision), -- Eikenhof (Aggregate & Readymix)
  ('SUP-002', -25.921007::double precision, 28.122684::double precision), -- Midrand (Rossway Quarry)
  ('SUP-003', -25.777702::double precision, 28.484950::double precision), -- Pretoria East (Donkerhoek Quarry)
  ('SUP-004', -25.608237::double precision, 28.052090::double precision), -- Rosslyn
  ('SUP-005', -26.034002::double precision, 28.315954::double precision), -- Bredell (Crushco)
  ('SUP-006', -25.843642::double precision, 28.214806::double precision), -- Lyttelton Dolomite Mine
  ('SUP-007', -25.633730::double precision, 28.015654::double precision), -- Eckraal Quarry
  ('SUP-008', -26.702169::double precision, 27.921986::double precision), -- Clinker Supplies (Vereeniging)
  ('SUP-010', -25.815803::double precision, 28.563153::double precision), -- Bronkhorstspruit (Alfa Sand)
  ('SUP-011', -25.859878::double precision, 28.678916::double precision), -- Mowcop Silica Mine directions link
  ('SUP-013', -29.865556::double precision, 30.945278::double precision), -- Ridgeview Quarry
  ('SUP-014', -29.564826::double precision, 31.146003::double precision), -- Tongaat Quarry
  ('SUP-015', -29.261767::double precision, 31.307689::double precision), -- Stanger Quarry
  ('SUP-016', -29.637256::double precision, 30.477426::double precision), -- Pietermaritzburg Quarry (235 Pope Ellis Dr, Ashburton)
  ('SUP-017', -29.900909::double precision, 30.952862::double precision), -- Coedmore (Aggregate), 200 Coedmore Road, Bellair
  ('SUP-018', -28.570667::double precision, 29.819611::double precision), -- Ladysmith (Aggregate & Readymix)
  ('SUP-021', -28.147133::double precision, 30.189547::double precision), -- Dundee Quarry
  ('SUP-022', -27.730944::double precision, 30.779138::double precision), -- Vryheid Quarry
  ('SUP-023', -33.822930::double precision, 18.578121::double precision), -- Tygerberg Quarry
  ('SUP-024', -34.001985::double precision, 18.735367::double precision), -- Peak Quarry
  ('SUP-026', -31.681594::double precision, 18.544608::double precision), -- Cape Lime Vredendal
  ('SUP-027', -33.598464::double precision, 19.471622::double precision), -- Brewelskloof Quarry
  ('SUP-028', -33.691306::double precision, 19.315444::double precision), -- Smalblaar Quarry
  ('SUP-031', -25.892885::double precision, 28.933979::double precision), -- Hartebeesfontein Quarry
  ('SUP-032', -25.363547::double precision, 30.962633::double precision), -- Dingwell Quarry
  ('SUP-033', -25.680995::double precision, 31.267073::double precision), -- Sincobile (Lows Creek)
  ('SUP-037', -33.775741::double precision, 25.628145::double precision), -- Coega Quarry
  ('SUP-038', -32.969250::double precision, 27.791939::double precision), -- Blue Rock Quarry
  ('SUP-039', -31.556107::double precision, 28.832378::double precision), -- Mthatha
  ('SUP-040', -31.889104::double precision, 26.790603::double precision), -- Queenstown
  ('SUP-042', -30.712553::double precision, 26.685312::double precision), -- Aliwal North
  ('SUP-043', -26.136654::double precision, 26.185888::double precision), -- Lichtenburg Cement
  ('SUP-045', -26.078747::double precision, 25.800339::double precision), -- Tswana Lime Quarry
  ('SUP-047', -23.865527::double precision, 27.156774::double precision), -- Glenover Mine
  ('SUP-048', -23.724978::double precision, 27.558811::double precision), -- Kuipersbult Quarry
  ('SUP-088', -29.063479::double precision, 26.240191::double precision), -- Bloemfontein (Petra)
  ('SUP-094', -28.262222::double precision, 28.302517::double precision), -- Bethlehem Quarry
  ('SUP-096', -28.414703::double precision, 28.886803::double precision), -- Qwa Qwa Quarry
  ('SUP-097', -28.819998::double precision, 24.708575::double precision) -- Kimberley
) AS v(id, lat, lng)
WHERE s."externalId" = v.id AND s."latitude" IS NULL AND s."longitude" IS NULL;
