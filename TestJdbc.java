import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
public class TestJdbc {
    public static void main(String[] args) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://neondb_owner:npg_XP9oDCKh5Stu@ep-icy-river-a5qx6s9h-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
        try {
            new HikariDataSource(config);
            System.out.println("Success");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
