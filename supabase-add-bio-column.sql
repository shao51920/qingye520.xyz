-- 为用户资料表添加个人简介字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- 添加注释
COMMENT ON COLUMN profiles.bio IS '用户个人简介，最多100字';
